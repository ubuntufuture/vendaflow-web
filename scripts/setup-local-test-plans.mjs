// Explicit local test data requested by the product owner. Never imported by runtime.
// Uses the local operator migration credential; does not mint sessions or fake MFA.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';

if(!process.argv.includes('--apply'))throw new Error('Use --apply para cadastrar os planos TESTE autorizados.');
const root=process.cwd();
const directory=path.resolve(JSON.parse(fs.readFileSync('.local/runtime-location.json','utf8')).directory);
if(directory.toLowerCase()!==path.resolve('D:/VendaFlowAi-runtime').toLowerCase())throw new Error('Bootstrap exclusivo do runtime local autorizado da Venda Flow AI.');
const runtime=JSON.parse(fs.readFileSync(path.join(directory,'runtime.json'),'utf8'));
if(runtime.NODE_ENV!=='development'||runtime.VENDA_LOCAL_DEVELOPMENT!=='true'||new URL(runtime.DATABASE_URL).hostname!=='127.0.0.1'||new URL(runtime.DATABASE_URL).pathname!=='/venda_flow_local')throw new Error('Planos de teste proibidos fora do banco local dedicado.');
const keys=JSON.parse(fs.readFileSync(path.join(directory,'secrets.json'),'utf8'));
if(keys.mercadoPagoSandbox?.mode!=='test'||!keys.adminIdentity?.userId)throw new Error('Sandbox e identidade do administrador precisam estar configurados.');
const plans=[
 {code:'teste-essencial',name:'TESTE — Essencial',amountCents:1000,features:['crm'],limits:{contacts:100,members:1}},
 {code:'teste-equipe',name:'TESTE — Equipe',amountCents:2000,features:['crm','whatsapp','reports'],limits:{contacts:1000,members:5,monthly_conversations:100}},
 {code:'teste-completo',name:'TESTE — Completo',amountCents:3000,features:['crm','whatsapp','ai','automations','reports'],limits:{contacts:5000,members:10,monthly_conversations:500,monthly_ai_tokens:10000}},
];
const pg=createRequire(path.join(root,'venda-api/package.json'))('pg');
const db=new pg.Client({connectionString:`postgresql://venda_local_migrator:${keys.dbAdmin}@127.0.0.1:55432/venda_flow_local`,connectionTimeoutMillis:5000});
await db.connect();const outcomes=[];
try{
 await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtextextended('venda.local-test-plans',0))");
 const actor=(await db.query("SELECT id FROM venda_admin.users WHERE issuer=$1 AND subject=$2 AND role='platform_admin' AND active",['http://127.0.0.1:38080/realms/venda-flow-admin-local',keys.adminIdentity.userId])).rows[0];
 if(!actor)throw new Error('Administrador interno real e ativo não confirmado; nenhum usuário será inventado.');
 for(const plan of plans){
  if((await db.query('SELECT 1 FROM venda_admin.plan_versions WHERE code=$1',[plan.code])).rowCount){outcomes.push({code:plan.code,result:'preserved_existing_versions'});continue;}
  const row=(await db.query("INSERT INTO venda_admin.plan_versions(code,version,name,amount_cents,frequency,frequency_type,features,limits,created_by,environment) VALUES($1,1,$2,$3,1,'months',$4,$5,$6,'test') RETURNING id",[plan.code,plan.name,plan.amountCents,JSON.stringify(plan.features),JSON.stringify(plan.limits),actor.id])).rows[0];
  const requestId=randomUUID();
  await db.query("INSERT INTO venda_admin.audit(actor_id,action,entity_id,request_id,origin) VALUES($1,'plan.created',$2,$3,'local_test_setup')",[actor.id,row.id,requestId]);
  await db.query("UPDATE venda_admin.plan_versions SET status='published',revision=2,published_at=clock_timestamp() WHERE id=$1",[row.id]);
  await db.query("INSERT INTO venda_admin.audit(actor_id,action,entity_id,request_id,origin) VALUES($1,'plan.published',$2,$3,'local_test_setup')",[actor.id,row.id,requestId]);
  outcomes.push({code:plan.code,name:plan.name,amountCents:plan.amountCents,currency:'BRL',environment:'test',periodicity:'monthly',result:'created'});
 }
 await db.query('COMMIT');
}catch(error){await db.query('ROLLBACK');throw error;}finally{await db.end();}
const report={executedAt:new Date().toISOString(),classification:'TESTE — autorizado pelo usuário em 28/11/2026',scope:'Somente venda_flow_local em loopback',operatorOrigin:'local_test_setup',productionCatalogVisible:false,paymentsCreated:0,sessionsCreated:0,outcomes};
fs.mkdirSync('docs/assinaturas/evidencias',{recursive:true});fs.writeFileSync('docs/assinaturas/evidencias/planos-teste.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
