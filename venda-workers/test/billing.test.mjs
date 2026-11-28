// DEMO_ONLY. Real PostgreSQL + real HTTP API, signed protocol IdP and isolated provider transport.
import {before,after,describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {postgresFixture,freePort} from '../../venda-api/dist/test/postgres.js';
import {idpFixture} from '../../venda-api/dist/test/idp.js';
import {createApp} from '../../venda-api/build/app.js';
import {loadConfig} from '../../venda-api/build/config.js';
import {MercadoPagoRecurringClient} from '../../venda-api/build/billing/subscriptions-client.js';
import {processBillingOnce} from '../build/billing/processor.js';
process.env.NODE_ENV='test';
const root=fileURLToPath(new URL('../../',import.meta.url));let fixture,idp,runtime,worker,base,config,ownerA,ownerB,viewer,billing,orgA,orgB,planId;const outcomes=[];
async function request(route,user,method='GET',body,headers={}){const response=await fetch(base+route,{method,redirect:'manual',headers:{...(user?{Cookie:user.cookie}:{}),...(method==='POST'?{'Content-Type':'application/json',Origin:config.appOrigin,'X-CSRF-Token':user?.csrf??'','Idempotency-Key':randomUUID()}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,body:await response.json()};}
async function login(subject){idp.select(subject);const first=await fetch(base+'/v1/auth/login',{redirect:'manual'}),flow=first.headers.getSetCookie().find(v=>v.startsWith('__Host-venda_oidc=')).split(';')[0];const auth=await fetch(first.headers.get('location'),{redirect:'manual'}),callback=await fetch(auth.headers.get('location'),{redirect:'manual',headers:{Cookie:flow}});assert.equal(callback.status,302);const cookie=callback.headers.getSetCookie().find(v=>v.startsWith('__Host-venda_session=')).split(';')[0];const user={cookie,csrf:'',id:''};const me=await request('/v1/me',user);user.csrf=me.body.csrfToken;user.id=me.body.user.id;return user;}
const route=(org,path)=>'/v1/billing/'+path+'?organizationId='+org;
async function checkout(org,user=ownerA,key=randomUUID()){return request(route(org,'checkout'),user,'POST',{planId,payerEmail:'DEMO_ONLY@testuser.com'},{'Idempotency-Key':key});}
function provider({timeout=false,status='pending',amount=10,cancelTimeoutOnce=false}={}){let posts=0,puts=0;const records=new Map();const transport=async(input,init)=>{const url=String(input);let data;if(url.endsWith('/users/me'))data={id:1,site_id:'MLB',tags:['test_user']};else if(init.method==='POST'){posts++;if(timeout)throw new DOMException('DEMO_ONLY timeout','TimeoutError');const body=JSON.parse(String(init.body)),id='DEMO_ONLY_'+randomUUID();data={id,external_reference:body.external_reference,collector_id:1,status,last_modified:new Date().toISOString(),auto_recurring:{currency_id:'BRL',transaction_amount:amount,frequency:1,frequency_type:'months'},init_point:'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id='+id};records.set(id,data);}else{const id=url.split('/').at(-1),old=records.get(id);if(!old)throw new Error('DEMO_ONLY sem recurso');if(init.method==='PUT'){puts++;old.status='cancelled';old.last_modified=new Date().toISOString();if(cancelTimeoutOnce&&puts===1)throw new DOMException('DEMO_ONLY timeout após cancelamento','TimeoutError');}data={...old,status:init.method==='PUT'?'cancelled':old.status==='cancelled'?'cancelled':status};}return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});};return{gateway:new MercadoPagoRecurringClient({environment:'test',accessToken:'TEST-DEMO-ONLY-CREDENTIAL',returnUrl:'https://app.example.test/faturamento'},transport),get posts(){return posts;},get puts(){return puts;},records};}
async function reset(){await fixture.control.query('DELETE FROM venda.billing_idempotency');await fixture.control.query('DELETE FROM venda.billing_commands');await fixture.control.query('DELETE FROM venda.billing_subscriptions');}
function test(name,fn){it(name,async()=>{await reset();try{await fn();outcomes.push({name,status:'PASS'});}catch(error){outcomes.push({name,status:'FAIL'});throw error;}});}
describe('DEMO_ONLY — faturamento durável, tenant isolation e worker real',()=>{
 before(async()=>{
  process.chdir(path.join(root,'venda-api'));fixture=await postgresFixture();idp=await idpFixture();base='http://127.0.0.1:'+await freePort();
  config=loadConfig({NODE_ENV:'test',PORT:new URL(base).port,DATABASE_URL:fixture.databaseUrl,API_ORIGIN:base,APP_ORIGIN:base,OIDC_ISSUER:idp.issuer,OIDC_CLIENT_ID:idp.clientId,OIDC_CLIENT_SECRET:idp.clientSecret,SESSION_HASH_KEY:randomBytes(32).toString('hex'),FLOW_ENCRYPTION_KEY:randomBytes(32).toString('hex'),CSRF_KEY:randomBytes(32).toString('hex'),BILLING_ENVIRONMENT:'test',BILLING_ENABLED:'true'});
  runtime=await createApp(config,undefined,()=>{});await runtime.app.listen(Number(new URL(base).port),'127.0.0.1');
  ownerA=await login('DEMO_ONLY-billing-owner-A');ownerB=await login('DEMO_ONLY-billing-owner-B');viewer=await login('DEMO_ONLY-billing-viewer');billing=await login('DEMO_ONLY-billing-role');
  orgA=(await request('/v1/organizations',ownerA,'POST',{name:'DEMO_ONLY faturamento A',timezone:'America/Sao_Paulo'})).body.id;orgB=(await request('/v1/organizations',ownerB,'POST',{name:'DEMO_ONLY faturamento B',timezone:'America/Sao_Paulo'})).body.id;
  for(const[user,role]of[[viewer,'viewer'],[billing,'billing']])assert.equal((await request('/v1/organizations/'+orgA+'/memberships',ownerA,'POST',{userId:user.id,role})).status,201);
  const actor=(await fixture.control.query("INSERT INTO venda_admin.users(issuer,subject,role) VALUES('https://demo-only.invalid','DEMO_ONLY-billing-catalog','platform_admin') RETURNING id")).rows[0];
  planId=(await fixture.control.query("INSERT INTO venda_admin.plan_versions(code,version,name,amount_cents,frequency,frequency_type,features,limits,created_by,environment) VALUES('teste-demo-billing',1,'TESTE DEMO_ONLY faturamento',1000,1,'months','[\"crm\"]','{}',$1,'test') RETURNING id",[actor.id])).rows[0].id;
  await fixture.control.query("UPDATE venda_admin.plan_versions SET status='published',revision=2,published_at=clock_timestamp() WHERE id=$1",[planId]);
  const password=randomBytes(32).toString('hex');await fixture.control.query(`CREATE ROLE venda_test_billing_worker LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD '${password}'`);await fixture.control.query('GRANT venda_billing_worker TO venda_test_billing_worker');const url=new URL(fixture.databaseUrl);url.username='venda_test_billing_worker';url.password=password;worker=new pg.Pool({connectionString:url.href,max:2});
 },{timeout:300000});
 after(async()=>{const evidence=path.join(root,'docs/assinaturas/evidencias');fs.mkdirSync(evidence,{recursive:true});fs.writeFileSync(path.join(evidence,'integracao-billing.json'),JSON.stringify({executedAt:new Date().toISOString(),classification:'DEMO_ONLY',database:'PostgreSQL real isolado',provider:'Transporte HTTP de teste, sem cobranças externas',outcomes},null,2)+'\n');await worker?.end();await runtime?.close();await idp?.close();await fixture?.stop();process.chdir(root);});
 test('catálogo por ambiente, papéis, CSRF e isolamento A/B em todos os seletores',async()=>{
  assert.equal((await request(route(orgA,'plans'),ownerA)).body.data[0].environment,'test');assert.equal((await request('/v1/plans')).body.data.length,0);
  assert.equal((await request(route(orgA,'status'),viewer)).status,403);assert.equal((await request(route(orgA,'status'),billing)).status,200);assert.equal((await request(route(orgB,'status'),ownerA)).status,404);
  assert.equal((await request(route(orgA,'status'),ownerA,'GET',undefined,{'X-Organization-Id':orgB})).status,400);
  assert.equal((await request(route(orgA,'checkout'),viewer,'POST',{planId,payerEmail:'DEMO_ONLY@testuser.com'})).status,403);
  assert.equal((await request(route(orgA,'checkout'),ownerA,'POST',{planId,payerEmail:'DEMO_ONLY@testuser.com',amountCents:1})).status,400);
  assert.equal((await request(route(orgA,'checkout'),ownerA,'POST',{planId,payerEmail:'DEMO_ONLY@testuser.com'},{'X-CSRF-Token':'invalid'})).status,403);
  assert.equal((await request(route(orgA,'checkout'),ownerA,'POST',{planId,payerEmail:'DEMO_ONLY@example.test'})).status,400);
  config.billingEnabled=false;assert.equal((await checkout(orgA)).status,503);assert.equal((await request(route(orgA,'status'),ownerA)).body.reason,'provider_configuration_pending');config.billingEnabled=true;
  await assert.rejects(()=>runtime.db.pool.query("SELECT venda.claim_billing_command('test')"),/permission denied/);await assert.rejects(()=>runtime.db.pool.query("SELECT venda_admin.resolve_identity('https://demo-only.invalid','DEMO_ONLY-forged','platform_admin')"),/permission denied/);await assert.rejects(()=>worker.query('SELECT * FROM venda.contacts'),/permission denied/);
 });
 test('comando transacional e idempotente gera apenas um checkout; autorização não libera recursos',async()=>{
  const key=randomUUID(),intent=await checkout(orgA,ownerA,key);assert.equal(intent.status,202,JSON.stringify(intent.body));assert.deepEqual((await checkout(orgA,ownerA,key)).body,intent.body);assert.equal((await checkout(orgA)).status,409);
  const remote=provider({status:'authorized'});await Promise.all([processBillingOnce(worker,remote.gateway,'test'),processBillingOnce(worker,remote.gateway,'test')]);assert.equal(remote.posts,1);
  const status=await request(route(orgA,'status'),ownerA);assert.equal(status.body.subscription.state,'authorized');assert.equal(status.body.paymentVerified,false);assert.deepEqual(status.body.entitlements.features,[]);
  assert.equal((await request(route(orgB,'subscriptions/'+intent.body.subscriptionId+'/cancel'),ownerB,'POST',{})).status,404);
  await assert.rejects(()=>runtime.db.tx({userId:ownerA.id,sessionHash:runtime.auth.hash(ownerA.cookie.split('=')[1]),organizationId:orgA},client=>client.query("UPDATE venda.billing_subscriptions SET state='authorized' WHERE id=$1",[intent.body.subscriptionId])),/row-level security/);
 });
 test('timeout de criação fica em análise e nunca repete POST automaticamente',async()=>{
  assert.equal((await checkout(orgA)).status,202);const remote=provider({timeout:true});await processBillingOnce(worker,remote.gateway,'test');await processBillingOnce(worker,remote.gateway,'test');assert.equal(remote.posts,1);assert.equal((await request(route(orgA,'status'),ownerA)).body.subscription.state,'requires_review');assert.equal((await checkout(orgA)).status,409);
 });
 test('cancelamento antes do envio é local; depois do envio exige confirmação do gateway',async()=>{
  let intent=await checkout(orgA);assert.equal((await request(route(orgA,'subscriptions/'+intent.body.subscriptionId+'/cancel'),ownerA,'POST',{})).status,202);const remote=provider();for(let i=0;i<3;i++)await processBillingOnce(worker,remote.gateway,'test');assert.equal(remote.posts,0);assert.equal((await request(route(orgA,'status'),ownerA)).body.subscription.state,'cancelled');
  await reset();intent=await checkout(orgA);await processBillingOnce(worker,remote.gateway,'test');assert.equal((await request(route(orgA,'subscriptions/'+intent.body.subscriptionId+'/cancel'),ownerA,'POST',{})).status,202);await processBillingOnce(worker,remote.gateway,'test');assert.equal(remote.puts,1);assert.equal((await request(route(orgA,'status'),ownerA)).body.subscription.state,'cancelled');
 });
 test('lease expirada não repete criação e cancelamento incerto não vira sucesso fictício',async()=>{
  const intent=await checkout(orgA);const claimed=(await worker.query("SELECT venda.claim_billing_command('test') AS job")).rows[0].job;assert.equal(claimed.kind,'create');
  await fixture.control.query("UPDATE venda.billing_commands SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1",[claimed.commandId]);
  const remote=provider();await processBillingOnce(worker,remote.gateway,'test');assert.equal(remote.posts,0);assert.equal((await request(route(orgA,'status'),ownerA)).body.subscription.state,'requires_review');
  await request(route(orgA,'subscriptions/'+intent.body.subscriptionId+'/cancel'),ownerA,'POST',{});await processBillingOnce(worker,remote.gateway,'test');assert.equal(remote.puts,0);assert.equal((await request(route(orgA,'status'),ownerA)).body.subscription.state,'requires_review');
 });
 test('divergência do preço no provedor impede exibição do checkout',async()=>{
  await checkout(orgA);const remote=provider({amount:11});await processBillingOnce(worker,remote.gateway,'test');const status=(await request(route(orgA,'status'),ownerA)).body;assert.equal(status.subscription.state,'requires_review');assert.equal(status.subscription.checkoutUrl,null);assert.equal(status.paymentVerified,false);
 });
 test('cancelamento com timeout usa consulta posterior sem repetir a escrita externa',async()=>{
  const intent=await checkout(orgA),remote=provider({cancelTimeoutOnce:true});await processBillingOnce(worker,remote.gateway,'test');await request(route(orgA,'subscriptions/'+intent.body.subscriptionId+'/cancel'),ownerA,'POST',{});await processBillingOnce(worker,remote.gateway,'test');
  assert.equal((await request(route(orgA,'status'),ownerA)).body.subscription.state,'cancellation_pending');assert.equal(remote.puts,1);
  await fixture.control.query("UPDATE venda.billing_commands SET next_attempt_at=clock_timestamp()-interval '1 second' WHERE kind='cancel' AND state='retry'");await processBillingOnce(worker,remote.gateway,'test');assert.equal(remote.puts,1);assert.equal((await request(route(orgA,'status'),ownerA)).body.subscription.state,'cancelled');
 });
 test('ambiente é preservado por FK e outro administrador pode recuperar cancelamento revogado',async()=>{
  await assert.rejects(()=>fixture.control.query("INSERT INTO venda.billing_subscriptions(organization_id,plan_id,environment,created_by,payer_email) VALUES($1,$2,'production',$3,'DEMO_ONLY@testuser.com')",[orgA,planId,ownerA.id]),/foreign key constraint/);
  const intent=await checkout(orgA),remote=provider();await processBillingOnce(worker,remote.gateway,'test');await request(route(orgA,'subscriptions/'+intent.body.subscriptionId+'/cancel'),billing,'POST',{});
  await fixture.control.query('UPDATE venda.memberships SET active=false WHERE organization_id=$1 AND user_id=$2',[orgA,billing.id]);
  try{await processBillingOnce(worker,remote.gateway,'test');assert.equal(remote.puts,0);assert.equal((await request(route(orgA,'status'),ownerA)).body.subscription.state,'requires_review');assert.equal((await request(route(orgA,'subscriptions/'+intent.body.subscriptionId+'/cancel'),ownerA,'POST',{})).status,202);await processBillingOnce(worker,remote.gateway,'test');assert.equal((await request(route(orgA,'status'),ownerA)).body.subscription.state,'cancelled');}
  finally{await fixture.control.query('UPDATE venda.memberships SET active=true WHERE organization_id=$1 AND user_id=$2',[orgA,billing.id]);}
  const grants=await fixture.control.query("SELECT count(*)::int AS count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE n.nspname IN ('venda','venda_admin') AND a.grantee=0 AND a.privilege_type='EXECUTE'");assert.equal(grants.rows[0].count,0);
 });
 test('revogação de membership interrompe o comando ainda não enviado',async()=>{
  assert.equal((await checkout(orgA,billing)).status,202);await fixture.control.query('UPDATE venda.memberships SET active=false WHERE organization_id=$1 AND user_id=$2',[orgA,billing.id]);const remote=provider();await processBillingOnce(worker,remote.gateway,'test');assert.equal(remote.posts,0);assert.equal((await request(route(orgA,'status'),ownerA)).body.subscription.state,'failed');assert.equal((await request(route(orgA,'status'),billing)).status,404);
 });
});
