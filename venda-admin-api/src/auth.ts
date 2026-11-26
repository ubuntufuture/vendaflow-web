import{createHmac,randomBytes,timingSafeEqual,createCipheriv,createDecipheriv}from'node:crypto';
import{UnauthorizedException,ForbiddenException,BadRequestException}from'@nestjs/common';import type{Request,Response}from'express';
import{OidcClient,type Flow}from'../../venda-api/build/oidc.js';
import type{AdminConfig}from'./config.js';import{AdminDatabase}from'./database.js';
export const adminSessionCookie='__Host-venda_admin_session',adminFlowCookie='__Host-venda_admin_oidc';
const cookieOptions={httpOnly:true,secure:true,sameSite:'lax' as const,path:'/'};
const equal=(a:string,b:string)=>{const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);};
export type InternalRole='platform_admin'|'billing_admin'|'support_viewer';
export interface AdminPrincipal{id:string;role:InternalRole;hash:string;csrf:string;mfaAt:Date;expiresAt:Date;}
export interface AdminRequest extends Request{actor?:AdminPrincipal;requestId:string;}
export function mfaIdentity(claims:Record<string,unknown>,now=Date.now()):{role:InternalRole;mfaAt:Date}{
 const realm=claims.realm_access;const roles=typeof realm==='object'&&realm!==null&&'roles'in realm&&Array.isArray(realm.roles)?realm.roles:[];
 const role=(['platform_admin','billing_admin','support_viewer']as const).find(candidate=>roles.includes(candidate));
 const amr=claims.amr,authTime=claims.auth_time;
 if(!role||!Array.isArray(amr)||!amr.includes('pwd')||!amr.includes('otp')||typeof authTime!=='number'||!Number.isSafeInteger(authTime)||authTime*1000>now+60000||now-authTime*1000>300000)throw new UnauthorizedException();
 return{role,mfaAt:new Date(authTime*1000)};
}
export class AdminAuth{
 readonly oidc:OidcClient;
 constructor(readonly config:AdminConfig,readonly db:AdminDatabase){this.oidc=new OidcClient(config);}
 hash(value:string){return createHmac('sha256',this.config.sessionKey).update(value).digest('hex');}
 csrf(hash:string){return createHmac('sha256',this.config.csrfKey).update(hash).digest('base64url');}
 private encrypt(flow:Flow){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.config.flowKey,iv);const content=Buffer.concat([cipher.update(JSON.stringify(flow),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),content]).toString('base64url');}
 private decrypt(value:string):Flow{const raw=Buffer.from(value,'base64url');const cipher=createDecipheriv('aes-256-gcm',this.config.flowKey,raw.subarray(0,12));cipher.setAuthTag(raw.subarray(12,28));return JSON.parse(Buffer.concat([cipher.update(raw.subarray(28)),cipher.final()]).toString('utf8'))as Flow;}
 async begin(res:Response){const result=await this.oidc.begin({max_age:'300',claims:JSON.stringify({id_token:{amr:{essential:true},auth_time:{essential:true}}})});const handle=randomBytes(32).toString('base64url'),hash=this.hash(handle);await this.db.tx({flowHash:hash},client=>client.query("INSERT INTO venda_admin.flows(flow_hash,encrypted_payload,expires_at) VALUES($1,$2,clock_timestamp()+interval '5 minutes')",[hash,this.encrypt(result.flow)]));res.cookie(adminFlowCookie,handle,{...cookieOptions,maxAge:300000});res.redirect(302,result.url);}
 async callback(req:AdminRequest,res:Response){const handle=req.cookies?.[adminFlowCookie]as unknown;if(typeof handle!=='string'||!/^[\w-]{43}$/.test(handle))throw new UnauthorizedException();const query:Record<string,string>={};for(const[key,value]of Object.entries(req.query)){if(!['code','state','iss','session_state','error','error_description'].includes(key)||typeof value!=='string'||value.length>2048)throw new BadRequestException();query[key]=value;}
  const flowHash=this.hash(handle);const row=await this.db.tx({flowHash},async client=>(await client.query('DELETE FROM venda_admin.flows WHERE flow_hash=$1 AND expires_at>clock_timestamp() RETURNING encrypted_payload',[flowHash])).rows[0]);res.clearCookie(adminFlowCookie,cookieOptions);if(!row)throw new UnauthorizedException();
  let flow:Flow;try{flow=this.decrypt(row.encrypted_payload);}catch{throw new UnauthorizedException();}const identity=await this.oidc.exchange(query,flow),trusted=mfaIdentity(identity.identityClaims);
  const token=randomBytes(32).toString('base64url'),hash=this.hash(token);await this.db.tx({sessionHash:hash},async client=>{const user=(await client.query('SELECT venda_admin.resolve_identity($1,$2,$3) AS id',[identity.issuer,identity.subject,trusted.role])).rows[0];await client.query("SELECT set_config('venda_admin.user_id',$1,true)",[user.id]);await client.query("INSERT INTO venda_admin.sessions(token_hash,user_id,mfa_at,expires_at) VALUES($1,$2,$3,clock_timestamp()+interval '10 minutes')",[hash,user.id,trusted.mfaAt]);});res.cookie(adminSessionCookie,token,{...cookieOptions,maxAge:600000});res.redirect(302,this.config.webOrigin+'/app');
 }
 async authenticate(req:AdminRequest):Promise<AdminPrincipal>{const cookie=req.cookies?.[adminSessionCookie]as unknown;if(typeof cookie!=='string'||!/^[\w-]{43}$/.test(cookie))throw new UnauthorizedException();const hash=this.hash(cookie);return this.db.tx({sessionHash:hash},async client=>{const session=(await client.query('SELECT user_id,mfa_at,expires_at FROM venda_admin.sessions WHERE token_hash=$1 AND expires_at>clock_timestamp() AND revoked_at IS NULL',[hash])).rows[0];if(!session)throw new UnauthorizedException();await client.query("SELECT set_config('venda_admin.user_id',$1,true)",[session.user_id]);const user=(await client.query('SELECT id,role FROM venda_admin.users WHERE id=$1 AND active',[session.user_id])).rows[0];if(!user)throw new UnauthorizedException();return{id:user.id,role:user.role as InternalRole,hash,csrf:this.csrf(hash),mfaAt:session.mfa_at as Date,expiresAt:session.expires_at as Date};});}
 verifyCsrf(req:AdminRequest){const csrf=req.headers['x-csrf-token'];if(req.headers.origin!==this.config.webOrigin||typeof csrf!=='string'||!equal(csrf,req.actor!.csrf))throw new ForbiddenException();}
 verifyWrite(req:AdminRequest){this.verifyCsrf(req);const actor=req.actor!;if(!['platform_admin','billing_admin'].includes(actor.role)||Date.now()-actor.mfaAt.getTime()>300000)throw new ForbiddenException();}
 async logout(actor:AdminPrincipal,res:Response){await this.db.tx({userId:actor.id,sessionHash:actor.hash},client=>client.query('UPDATE venda_admin.sessions SET revoked_at=clock_timestamp() WHERE token_hash=$1',[actor.hash]));res.clearCookie(adminSessionCookie,cookieOptions);return{signedOut:true};}
}
