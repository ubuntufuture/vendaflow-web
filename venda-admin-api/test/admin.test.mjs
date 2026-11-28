// DEMO_ONLY. Dedicated PostgreSQL and signed protocol IdP; never loaded by the app.
import{before,after,describe,it}from'node:test';import assert from'node:assert/strict';import{randomBytes,randomUUID}from'node:crypto';import fs from'node:fs';import{fileURLToPath}from'node:url';
import{postgresFixture,freePort}from'../../venda-api/dist/test/postgres.js';import{idpFixture}from'../../venda-api/dist/test/idp.js';
import pg from'pg';
import{createAdminApp}from'../build/app.js';import{loadAdminConfig}from'../build/config.js';
process.env.NODE_ENV='test';let postgres,idp,customer,runtime,base,config;const outcomes=[];
async function login(mode='admin-valid'){
 idp.select('DEMO_ONLY-'+mode,mode);const start=await fetch(base+'/v1/auth/login',{redirect:'manual'});assert.equal(start.status,302);const flow=start.headers.getSetCookie().find(v=>v.startsWith('__Host-venda_admin_oidc='));assert.match(flow,/Secure/);assert.match(flow,/HttpOnly/);
 const authorize=await fetch(start.headers.get('location'),{redirect:'manual'});const callback=await fetch(authorize.headers.get('location'),{redirect:'manual',headers:{Cookie:flow.split(';')[0]}});if(callback.status!==302)return{status:callback.status};
 const cookie=callback.headers.getSetCookie().find(v=>v.startsWith('__Host-venda_admin_session=')).split(';')[0];const me=await fetch(base+'/v1/me',{headers:{Cookie:cookie}});const info=await me.json();return{status:callback.status,cookie,csrf:info.csrfToken,user:info.user};
}
async function request(path,user,method='GET',body,extra={}){const response=await fetch(base+path,{method,redirect:'manual',headers:{...(user?{Cookie:user.cookie}:{}),...(method!=='GET'?{Origin:config.webOrigin,'Content-Type':'application/json','X-CSRF-Token':user?.csrf??'','Idempotency-Key':randomUUID()}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:response.status,body:await response.json()};}
function test(name,fn){it(name,async()=>{try{await fn();outcomes.push({name,status:'PASS'});}catch(error){outcomes.push({name,status:'FAIL'});throw error;}});}
describe('DEMO_ONLY — fronteira admin e catálogo de planos com PostgreSQL real',()=>{
 before(async()=>{process.chdir(fileURLToPath(new URL('../../venda-api/',import.meta.url)));postgres=await postgresFixture();idp=await idpFixture();customer=await idpFixture();const password=randomBytes(32).toString('hex');await postgres.control.query(`CREATE ROLE venda_test_internal LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD '${password}'`);await postgres.control.query('GRANT venda_admin_api TO venda_test_internal');const url=new URL(postgres.databaseUrl);url.username='venda_test_internal';url.password=password;const port=await freePort();base='http://127.0.0.1:'+port;config=loadAdminConfig({NODE_ENV:'test',PORT:String(port),ADMIN_DATABASE_URL:url.href,ADMIN_WEB_ORIGIN:base,ADMIN_OIDC_ISSUER:idp.issuer,CUSTOMER_OIDC_ISSUER:customer.issuer,ADMIN_OIDC_CLIENT_ID:idp.clientId,ADMIN_OIDC_CLIENT_SECRET:idp.clientSecret,ADMIN_SESSION_HASH_KEY:randomBytes(32).toString('hex'),ADMIN_FLOW_ENCRYPTION_KEY:randomBytes(32).toString('hex'),ADMIN_CSRF_KEY:randomBytes(32).toString('hex')});process.chdir(fileURLToPath(new URL('../',import.meta.url)));runtime=await createAdminApp(config,()=>{});await runtime.app.listen(port,'127.0.0.1');}, {timeout:300000});
 after(async()=>{fs.mkdirSync('evidencias',{recursive:true});fs.writeFileSync('evidencias/admin-integracao.json',JSON.stringify({executedAt:new Date().toISOString(),fixture:'DEMO_ONLY PostgreSQL isolado e protocolo OIDC assinado',realInteractiveMfaExecuted:false,outcomes},null,2));await runtime?.close();await idp?.close();await customer?.close();await postgres?.stop();});
 test('identidade interna exige MFA e não aceita cookie/issuer do cliente',async()=>{
  assert.equal((await request('/ready')).status,200);for(const mode of['admin-no-mfa','admin-wrong-role','admin-stale-mfa'])assert.equal((await login(mode)).status,401);
  assert.equal((await request('/v1/me',null,'GET',undefined,{Cookie:'__Host-venda_session='+randomBytes(32).toString('base64url')})).status,401);
  assert.throws(()=>loadAdminConfig({NODE_ENV:'test',ADMIN_OIDC_ISSUER:customer.issuer,CUSTOMER_OIDC_ISSUER:customer.issuer}),/separada/);
 });
 test('plano nasce em rascunho; chave de intenção evita duas versões e suporte não altera preço',async()=>{
  const admin=await login(),support=await login('admin-viewer');const input={code:'demo-only',name:'DEMO_ONLY plano de contrato',amountCents:12345,frequency:1,frequencyType:'months',features:['crm'],limits:{contacts:100}};const key=randomUUID();
  const first=await request('/v1/plans',admin,'POST',input,{'Idempotency-Key':key});assert.equal(first.status,201,JSON.stringify(first.body));assert.equal(first.body.status,'draft');const replay=await request('/v1/plans',admin,'POST',input,{'Idempotency-Key':key});assert.deepEqual(replay.body,first.body);
  assert.equal((await request('/v1/plans',admin,'POST',{...input,amountCents:12346},{'Idempotency-Key':key})).status,409);assert.equal((await request('/v1/plans',support,'POST',input)).status,403);assert.equal((await request('/v1/plans',admin,'POST',input,{'X-CSRF-Token':'invalid'})).status,403);
  assert.equal((await request('/v1/plans',admin,'POST',input,{Origin:'https://invasor.invalid'})).status,403);assert.equal((await request('/v1/plans',admin,'POST',{...input,role:'platform_admin'})).status,400);
  assert.equal((await request('/v1/plans/'+'-'.repeat(36)+'/publish',admin,'POST',{}, {'If-Match':'1'})).status,400);
  const published=await request('/v1/plans/'+first.body.id+'/publish',admin,'POST',{}, {'If-Match':'1'});assert.equal(published.status,201,JSON.stringify(published.body));
  const second=await request('/v1/plans',admin,'POST',{...input,amountCents:20000});assert.equal(second.body.version,2);assert.equal((await request('/v1/plans/'+second.body.id+'/publish',admin,'POST',{}, {'If-Match':'1'})).status,201);
  const rows=(await request('/v1/plans',admin)).body.data;assert.equal(rows.find(r=>r.id===first.body.id).status,'retired');assert.equal(rows.find(r=>r.id===first.body.id).amountCents,12345);assert.equal(rows.find(r=>r.id===second.body.id).status,'published');
  await assert.rejects(()=>postgres.control.query('UPDATE venda_admin.plan_versions SET amount_cents=1 WHERE id=$1',[first.body.id]),/Immutable plan/);
  await assert.rejects(()=>runtime.db.pool.query('SELECT * FROM venda.contacts'),/permission denied/);
  await assert.rejects(()=>postgres.control.query('UPDATE venda_admin.audit SET action=$1',['plan.created']),/Append only/);
  assert.equal((await request('/v1/plans',admin,'GET',undefined,{'X-Organization-Id':randomUUID()})).status,400);
 });
 test('planos TESTE ficam separados do catálogo público e o ambiente é imutável',async()=>{
  const admin=await login();const input={code:'teste-contrato',name:'TESTE contrato de plano',amountCents:1000,frequency:1,frequencyType:'months',features:['crm'],limits:{contacts:100},environment:'test'};
  assert.equal((await request('/v1/plans',admin,'POST',{...input,code:'sem-prefixo'})).status,400);
  assert.equal((await request('/v1/plans',admin,'POST',{...input,environment:'production'})).status,400);
  const created=await request('/v1/plans',admin,'POST',input);assert.equal(created.status,201,JSON.stringify(created.body));assert.equal(created.body.environment,'test');
  const published=await request('/v1/plans/'+created.body.id+'/publish',admin,'POST',{}, {'If-Match':'1'});assert.equal(published.status,201);
  const customerDb=new pg.Client({connectionString:postgres.databaseUrl});await customerDb.connect();try{assert.equal((await customerDb.query('SELECT id FROM venda_admin.plan_versions WHERE id=$1',[created.body.id])).rowCount,0);}finally{await customerDb.end();}
  await assert.rejects(()=>postgres.control.query("UPDATE venda_admin.plan_versions SET environment='production' WHERE id=$1",[created.body.id]),/Immutable plan/);
 });
 test('MFA precisa ser recente para gravar e revogação interna vale no próximo uso',async()=>{
  const admin=await login();await postgres.control.query("UPDATE venda_admin.sessions SET mfa_at=clock_timestamp()-interval '6 minutes',expires_at=clock_timestamp()+interval '8 minutes' WHERE user_id=$1",[admin.user.id]);
  assert.equal((await request('/v1/plans',admin)).status,200);assert.equal((await request('/v1/plans',admin,'POST',{})).status,403);
  await postgres.control.query('UPDATE venda_admin.users SET active=false WHERE id=$1',[admin.user.id]);assert.equal((await request('/v1/me',admin)).status,401);
 });
});
