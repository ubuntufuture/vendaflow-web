// Read-only local evidence. Never serialize connection strings or credentials.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const root=process.cwd();
const directory=JSON.parse(fs.readFileSync(path.join(root,'.local/runtime-location.json'),'utf8')).directory;
const keys=JSON.parse(fs.readFileSync(path.join(directory,'secrets.json'),'utf8'));
const requireApi=createRequire(path.join(root,'venda-api/package.json'));
const {Client}=requireApi('pg');
const client=new Client({host:'127.0.0.1',port:55432,database:'venda_flow_local',user:'venda_local_migrator',password:keys.dbAdmin});
await client.connect();
try {
 const tables=['users','organizations','contacts','opportunities','tasks','knowledge','workflows'];
 const counts={};
 for(const table of tables) counts[table]=Number((await client.query(`SELECT count(*) FROM venda.${table}`)).rows[0].count);
 const rls=await client.query("SELECT count(*)::int AS tables, bool_and(relrowsecurity AND relforcerowsecurity) AS enforced FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='venda' AND c.relkind='r'");
 const roles=(await client.query("SELECT rolname,rolsuper,rolbypassrls FROM pg_roles WHERE rolname IN ('venda_app_local','venda_worker_local') ORDER BY rolname")).rows;
 const [discovery,ready,web,contract]=await Promise.all([fetch('http://127.0.0.1:38080/realms/venda-flow-local/.well-known/openid-configuration'),fetch('http://127.0.0.1:3201/ready'),fetch('http://127.0.0.1:3400/entrar'),fetch('http://127.0.0.1:3201/v1/openapi.json')]);
 const provider=await discovery.json();
 const schema=await contract.json();
 const result={capturedAt:new Date().toISOString(),runtimeDirectory:directory,database:'PostgreSQL real persistente',databaseVersion:(await client.query('SHOW server_version')).rows[0].server_version,counts,rls:rls.rows[0],roles,identity:{provider:'Keycloak real',issuer:provider.issuer,discoveryStatus:discovery.status},apiReadyStatus:ready.status,webStatus:web.status,openapi:{status:contract.status,paths:Object.keys(schema.paths??{}).length},businessSeeds:false,testPort:3491,applicationPort:3400,productionDeployed:false};
 const file=path.join(root,'docs/operacao-real/evidencias/runtime.json');fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
} finally {await client.end();}
