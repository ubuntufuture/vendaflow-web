// Configure only the dedicated Venda Flow local sandbox. No subscription is created.
import fs from 'node:fs';import path from 'node:path';import {randomBytes} from 'node:crypto';import {createRequire} from 'node:module';
const root=process.cwd(),directory=path.resolve(JSON.parse(fs.readFileSync('.local/runtime-location.json','utf8')).directory);
if(directory.toLowerCase()!==path.resolve('D:/VendaFlowAi-runtime').toLowerCase())throw new Error('Runtime local não reconhecido.');
const file=path.join(directory,'secrets.json'),keys=JSON.parse(fs.readFileSync(file,'utf8')),runtimeFile=path.join(directory,'runtime.json'),runtime=JSON.parse(fs.readFileSync(runtimeFile,'utf8'));
if(runtime.NODE_ENV!=='development'||new URL(runtime.DATABASE_URL).hostname!=='127.0.0.1'||new URL(runtime.DATABASE_URL).pathname!=='/venda_flow_local'||keys.mercadoPagoSandbox?.mode!=='test')throw new Error('Billing sandbox permitido somente no ambiente local autorizado.');
keys.billingWorker??={databasePassword:randomBytes(32).toString('hex')};
const supplied=process.env.VENDA_MERCADO_PAGO_RETURN_URL??keys.mercadoPagoSandbox.returnUrl;
if(supplied){let url;try{url=new URL(supplied);}catch{throw new Error('URL de retorno inválida.');}if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search||url.port)throw new Error('Forneça a URL HTTPS real de retorno, sem credenciais ou parâmetros.');keys.mercadoPagoSandbox.returnUrl=url.href;}
fs.writeFileSync(file,JSON.stringify(keys,null,2));
const pg=createRequire(path.join(root,'venda-api/package.json'))('pg'),db=new pg.Client({connectionString:`postgresql://venda_local_migrator:${keys.dbAdmin}@127.0.0.1:55432/venda_flow_local`});await db.connect();
try{if(Number((await db.query('SELECT max(version) AS version FROM public.venda_migrations')).rows[0].version)<10)throw new Error('Aplique as migrações verificadas até 010 antes de configurar billing.');
 if(!(await db.query("SELECT 1 FROM pg_roles WHERE rolname='venda_billing_worker_local'")).rowCount){if(!/^[a-f0-9]{64}$/.test(keys.billingWorker.databasePassword))throw new Error('Credencial local inválida.');await db.query(`CREATE ROLE venda_billing_worker_local LOGIN NOSUPERUSER NOBYPASSRLS INHERIT PASSWORD '${keys.billingWorker.databasePassword}'`);}await db.query('GRANT venda_billing_worker TO venda_billing_worker_local');
}finally{await db.end();}
const enabled=!!keys.mercadoPagoSandbox.returnUrl&&!!keys.mercadoPagoSandbox.accessToken;
runtime.BILLING_ENVIRONMENT='test';runtime.BILLING_ENABLED=String(enabled);fs.writeFileSync(runtimeFile,JSON.stringify(runtime,null,2));
const worker=enabled?{enabled:true,env:{NODE_ENV:'development',VENDA_BILLING_DATABASE_URL:`postgresql://venda_billing_worker_local:${keys.billingWorker.databasePassword}@127.0.0.1:55432/venda_flow_local`,MERCADO_PAGO_ENVIRONMENT:'test',MERCADO_PAGO_ACCESS_TOKEN:keys.mercadoPagoSandbox.accessToken,MERCADO_PAGO_RETURN_URL:keys.mercadoPagoSandbox.returnUrl}}:{enabled:false,reason:'return_url_pending'};
fs.writeFileSync(path.join(directory,'billing-worker.json'),JSON.stringify(worker,null,2));console.log(JSON.stringify({environment:'test',workerEnabled:enabled,checkoutAvailable:enabled,reason:enabled?'configured_pending_official_sandbox_validation':'https_return_url_pending',chargesCreated:0,credentialsRecorded:false}));
