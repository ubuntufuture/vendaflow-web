import {BadRequestException,ConflictException,ForbiddenException,NotFoundException,PayloadTooLargeException} from '@nestjs/common';
import {IsEnum,IsString,IsUUID,MaxLength,Matches} from 'class-validator';
import {createHash} from 'node:crypto';
import type {PoolClient} from 'pg';
import {AuthService,type Principal} from './auth.js';
import {membership,uuid} from './policy.js';
import {recordChange} from './events.js';
export class ConsentInput {
 @IsUUID() contactId!:string;
 @IsEnum(['service','marketing']) purpose!:'service'|'marketing';
 @IsEnum(['whatsapp','email']) channel!:'whatsapp'|'email';
 @IsEnum(['granted','revoked']) status!:'granted'|'revoked';
 @IsEnum(['consent','contract','legal_obligation','legitimate_interest']) lawfulBasis!:string;
 @IsString() @Matches(/\S/) @MaxLength(64) noticeVersion!:string;
 @IsString() @Matches(/\S/) @MaxLength(240) sourceReference!:string;
}
export class PrivacyRequestInput {
 @IsUUID() contactId!:string;
 @IsEnum(['access','export','erasure']) kind!:'access'|'export'|'erasure';
 @IsString() @Matches(/\S/) @MaxLength(240) sourceReference!:string;
}
const consentView=(r:Record<string,unknown>)=>({id:r.id,organizationId:r.organization_id,contactId:r.contact_id,actorId:r.actor_id,purpose:r.purpose,channel:r.channel,status:r.status,lawfulBasis:r.lawful_basis,noticeVersion:r.notice_version,sourceReference:r.source_reference,recordedAt:(r.recorded_at as Date).toISOString()});
const requestView=(r:Record<string,unknown>)=>({id:r.id,organizationId:r.organization_id,contactId:r.contact_id,kind:r.kind,status:r.status,sourceReference:r.source_reference,createdAt:(r.created_at as Date).toISOString()});
function commercialView(r:Record<string,unknown>,fields:Record<string,string>){const result:Record<string,unknown>={id:r.id,organizationId:r.organization_id,version:r.version,archived:r.archived,createdAt:(r.created_at as Date).toISOString(),updatedAt:(r.updated_at as Date).toISOString()};for(const [key,column]of Object.entries(fields)){const value=r[column];result[key]=value instanceof Date?value.toISOString():key==='amountCents'&&value!==null?Number(value):value;}return result;}
export class PrivacyService {
 constructor(private readonly auth:AuthService){}
 private tx<T>(actor:Principal,org:string,fn:(client:PoolClient)=>Promise<T>){uuid(org);return this.auth.db.tx({userId:actor.userId,organizationId:org,sessionHash:actor.sessionHash},async client=>{await this.auth.activeInTransaction(client,actor);const role=await membership(client,actor.userId,org);if(!['owner','admin','manager'].includes(role))throw new ForbiddenException();return fn(client);});}
 async list(actor:Principal,org:string,kind:'consent'|'request'){return this.tx(actor,org,async client=>({data:(await client.query(`SELECT * FROM venda.${kind==='consent'?'consents':'privacy_requests'} WHERE organization_id=$1 ORDER BY ${kind==='consent'?'recorded_at':'created_at'} DESC,id DESC LIMIT 100`,[org])).rows.map(r=>kind==='consent'?consentView(r):requestView(r))}));}
 private once<T>(client:PoolClient,actor:Principal,org:string,scope:string,key:unknown,body:object,fn:()=>Promise<T>){return (async()=>{
  if(typeof key!=='string'||!/^[A-Za-z0-9_-]{16,128}$/.test(key))throw new BadRequestException();
  const hash=createHash('sha256').update(JSON.stringify(body,Object.keys(body).sort())).digest('hex');
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`privacy:${org}:${actor.userId}:${scope}:${key}`]);
  const old=(await client.query('SELECT request_hash,result FROM venda.privacy_idempotency WHERE organization_id=$1 AND actor_id=$2 AND scope=$3 AND key=$4',[org,actor.userId,scope,key])).rows[0];
  if(old){if(old.request_hash!==hash)throw new ConflictException();return old.result as T;}
  const result=await fn();await client.query('INSERT INTO venda.privacy_idempotency(organization_id,actor_id,scope,key,request_hash,result) VALUES($1,$2,$3,$4,$5,$6)',[org,actor.userId,scope,key,hash,JSON.stringify(result)]);return result;
 })();}
 async createConsent(actor:Principal,org:string,body:ConsentInput,key:unknown,requestId:string){
  if(body.purpose==='marketing'&&body.status==='granted'&&body.lawfulBasis!=='consent')throw new BadRequestException();
  return this.tx(actor,org,client=>this.once(client,actor,org,'consent',key,body,async()=>{
   if(!(await client.query('SELECT id FROM venda.contacts WHERE organization_id=$1 AND id=$2 AND NOT archived FOR KEY SHARE',[org,uuid(body.contactId)])).rowCount)throw new NotFoundException();
   const row=(await client.query('INSERT INTO venda.consents(organization_id,contact_id,actor_id,purpose,channel,status,lawful_basis,notice_version,source_reference) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[org,body.contactId,actor.userId,body.purpose,body.channel,body.status,body.lawfulBasis,body.noticeVersion.trim(),body.sourceReference.trim()])).rows[0];
   await recordChange(client,org,actor.userId,'privacy.consent.recorded',row.id,requestId);return consentView(row);
  }));
 }
 async createRequest(actor:Principal,org:string,body:PrivacyRequestInput,key:unknown,requestId:string){return this.tx(actor,org,client=>this.once(client,actor,org,'request',key,body,async()=>{
  if(!(await client.query('SELECT id FROM venda.contacts WHERE organization_id=$1 AND id=$2 FOR KEY SHARE',[org,uuid(body.contactId)])).rowCount)throw new NotFoundException();
  const row=(await client.query('INSERT INTO venda.privacy_requests(organization_id,contact_id,actor_id,kind,source_reference) VALUES($1,$2,$3,$4,$5) RETURNING *',[org,body.contactId,actor.userId,body.kind,body.sourceReference.trim()])).rows[0];await recordChange(client,org,actor.userId,'privacy.request.created',row.id,requestId);return requestView(row);
 }));}
 async exportRequest(actor:Principal,org:string,id:string,requestId:string){return this.tx(actor,org,async client=>{
  const request=(await client.query('SELECT * FROM venda.privacy_requests WHERE organization_id=$1 AND id=$2',[org,uuid(id)])).rows[0];if(!request)throw new NotFoundException();if(request.kind==='erasure')throw new ConflictException();
  const contact=(await client.query('SELECT * FROM venda.contacts WHERE organization_id=$1 AND id=$2',[org,request.contact_id])).rows[0];if(!contact)throw new NotFoundException();
  const opportunities=(await client.query('SELECT * FROM venda.opportunities WHERE organization_id=$1 AND contact_id=$2 ORDER BY id LIMIT 501',[org,contact.id])).rows;
  const tasks=(await client.query('SELECT * FROM venda.tasks WHERE organization_id=$1 AND (contact_id=$2 OR opportunity_id IN (SELECT id FROM venda.opportunities WHERE organization_id=$1 AND contact_id=$2)) ORDER BY id LIMIT 501',[org,contact.id])).rows;
  const consents=(await client.query('SELECT * FROM venda.consents WHERE organization_id=$1 AND contact_id=$2 ORDER BY recorded_at,id LIMIT 501',[org,contact.id])).rows;
  if([opportunities,tasks,consents].some(rows=>rows.length>500))throw new PayloadTooLargeException();
  await recordChange(client,org,actor.userId,'privacy.export.read',id,requestId);
  return {scope:'contact_and_linked_commercial_records',generatedAt:new Date().toISOString(),contact:commercialView(contact,{name:'name',phone:'phone',email:'email'}),opportunities:opportunities.map(r=>({...commercialView(r,{title:'title',stage:'stage',contactId:'contact_id',amountCents:'amount_cents'}),currency:'BRL'})),tasks:tasks.map(r=>commercialView(r,{title:'title',contactId:'contact_id',opportunityId:'opportunity_id',completed:'completed',dueAt:'due_at'})),consents:consents.map(consentView)};
 });}
}
