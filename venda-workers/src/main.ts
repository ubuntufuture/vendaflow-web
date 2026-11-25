import {Pool} from 'pg';
const connectionString=process.env.VENDA_WORKER_DATABASE_URL;
if(!connectionString) throw new Error('VENDA_WORKER_DATABASE_URL pendente. Nunca reutilize a credencial da API.');
const url=new URL(connectionString),production=process.env.NODE_ENV==='production';
if(!['postgres:','postgresql:'].includes(url.protocol)||url.search)throw new Error('Configuração de worker inválida; valores omitidos.');
if(production&&!process.env.VENDA_WORKER_DB_CA_PEM)throw new Error('CA TLS obrigatória no worker de produção.');
if(!production&&!['127.0.0.1','localhost'].includes(url.hostname))throw new Error('Worker local deve usar banco em loopback.');
const pool=new Pool({connectionString,max:2,connectionTimeoutMillis:3000,statement_timeout:5000,ssl:production?{rejectUnauthorized:true,ca:process.env.VENDA_WORKER_DB_CA_PEM!}:false});
pool.on('error',()=>{});
const role=await pool.query<{safe:boolean}>("SELECT NOT rolsuper AND NOT rolbypassrls AND pg_has_role(current_user,'venda_worker','MEMBER') AND NOT pg_has_role(current_user,'venda_api','MEMBER') AND NOT pg_has_role(current_user,'venda_automation_executor','MEMBER') AS safe FROM pg_roles WHERE rolname=current_user");
if(role.rows[0]?.safe!==true){await pool.end();throw new Error('Credencial do worker sem isolamento adequado.');}
let stop=false;
process.once('SIGINT',()=>{stop=true;});process.once('SIGTERM',()=>{stop=true;});
console.log(JSON.stringify({service:'venda-workers',status:'ready',pollMs:2000}));
while(!stop){
 try{const result=await pool.query<{processed:number}>('SELECT venda.execute_automation_batch(10) AS processed');if(result.rows[0]?.processed)console.log(JSON.stringify({service:'venda-workers',processed:result.rows[0].processed}));}
 catch{console.error(JSON.stringify({service:'venda-workers',code:'WORKER_UNAVAILABLE'}));}
 await new Promise<void>(resolve=>setTimeout(resolve,2000));
}
await pool.end();
