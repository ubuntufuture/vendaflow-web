import {Pool} from 'pg';
import {MercadoPagoRecurringClient} from '../../../venda-api/build/billing/subscriptions-client.js';
import {processBillingOnce} from './processor.js';
const required=(name:string)=>{const value=process.env[name];if(!value)throw new Error('Configuração de billing pendente: '+name);return value;};
const mode=required('NODE_ENV');if(!['development','production'].includes(mode))throw new Error('Ambiente do worker de cobrança inválido.');
const environment=required('MERCADO_PAGO_ENVIRONMENT');if(!['test','production'].includes(environment)||mode==='production'&&environment==='test')throw new Error('Sandbox não pode executar em produção.');
const target=new URL(required('VENDA_BILLING_DATABASE_URL'));if(!['postgres:','postgresql:'].includes(target.protocol)||target.search||target.hash||!target.username||!target.password)throw new Error('Banco do worker de cobrança inválido.');
if(mode==='development'&&!['127.0.0.1','localhost'].includes(target.hostname))throw new Error('Worker local deve usar loopback.');
if(mode==='production'&&!process.env.VENDA_BILLING_DB_CA_PEM)throw new Error('CA TLS obrigatória.');
const pool=new Pool({connectionString:target.href,max:2,connectionTimeoutMillis:3000,statement_timeout:5000,ssl:mode==='production'?{rejectUnauthorized:true,ca:process.env.VENDA_BILLING_DB_CA_PEM!}:false});pool.on('error',()=>{});
const safe=(await pool.query("SELECT NOT rolsuper AND NOT rolbypassrls AND pg_has_role(current_user,'venda_billing_worker','MEMBER') AND NOT pg_has_role(current_user,'venda_api','MEMBER') AND NOT pg_has_role(current_user,'venda_worker','MEMBER') AND NOT pg_has_role(current_user,'venda_owner','MEMBER') AND NOT pg_has_role(current_user,'venda_billing_executor','MEMBER') AND NOT pg_has_role(current_user,'venda_admin_api','MEMBER') AS safe FROM pg_roles WHERE rolname=current_user")).rows[0]?.safe;
if(!safe){await pool.end();throw new Error('Role sem isolamento para billing.');}
const gateway=new MercadoPagoRecurringClient({environment:environment as 'test'|'production',accessToken:required('MERCADO_PAGO_ACCESS_TOKEN'),returnUrl:required('MERCADO_PAGO_RETURN_URL')});
let stopping=false;process.once('SIGINT',()=>{stopping=true;});process.once('SIGTERM',()=>{stopping=true;});
console.log(JSON.stringify({service:'venda-billing-worker',status:'ready',environment}));
while(!stopping){try{await processBillingOnce(pool,gateway,environment as 'test'|'production');}catch{console.error(JSON.stringify({service:'venda-billing-worker',code:'BILLING_WORKER_UNAVAILABLE'}));}await new Promise(resolve=>setTimeout(resolve,2000));}
await pool.end();
