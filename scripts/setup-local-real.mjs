// Provisions real local services. No test fixture imports, users, contacts, prices or seeds.
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const root=process.cwd(),dir=path.join(root,'.local');
fs.mkdirSync(path.join(dir,'identity-import'),{recursive:true});
const secretsFile=path.join(dir,'secrets.json');
const secret=()=>randomBytes(32).toString('hex');
const keys=fs.existsSync(secretsFile)?JSON.parse(fs.readFileSync(secretsFile,'utf8')):{dbAdmin:secret(),dbApp:secret(),identityAdmin:secret(),client:secret(),session:secret(),flow:secret(),csrf:secret()};
if(!keys.dbWorker) keys.dbWorker=secret();
fs.writeFileSync(secretsFile,JSON.stringify(keys,null,2),{mode:0o600});
const envFile=path.join(dir,'compose.env');
fs.writeFileSync(envFile,`VENDA_LOCAL_DB_ADMIN_PASSWORD=${keys.dbAdmin}\nVENDA_LOCAL_IDENTITY_ADMIN_PASSWORD=${keys.identityAdmin}\n`,{mode:0o600});
const realm={realm:'venda-flow-local',enabled:true,displayName:'Venda Flow AI — acesso local',sslRequired:'external',registrationAllowed:true,registrationEmailAsUsername:true,loginWithEmailAllowed:true,resetPasswordAllowed:false,verifyEmail:false,passwordPolicy:'length(12) and digits(1)',bruteForceProtected:true,clients:[{clientId:'venda-web-local',name:'Venda Flow AI local',enabled:true,protocol:'openid-connect',publicClient:false,secret:keys.client,standardFlowEnabled:true,directAccessGrantsEnabled:false,serviceAccountsEnabled:false,redirectUris:['http://127.0.0.1:3400/v1/auth/callback'],webOrigins:['http://127.0.0.1:3400'],attributes:{'pkce.code.challenge.method':'S256','post.logout.redirect.uris':'http://127.0.0.1:3400/'}}]};
fs.writeFileSync(path.join(dir,'identity-import/venda-flow-local-realm.json'),JSON.stringify(realm,null,2),{mode:0o600});
console.log('Inicializando PostgreSQL persistente e Keycloak real, ambos exclusivos do Venda Flow AI e restritos ao localhost.');
const compose=spawn('docker',['compose','--env-file',envFile,'-f',path.join(root,'infra/local/compose.yaml'),'up','-d'],{stdio:'inherit',windowsHide:true});
if(await new Promise(resolve=>{compose.on('error',()=>resolve(-1));compose.on('exit',resolve);})!==0) throw new Error('Docker indisponível. Nenhum provedor simulado será iniciado.');
const requireApi=createRequire(path.join(root,'venda-api/package.json'));
const {default:pg}=await import(pathToFileURL(requireApi.resolve('pg')).href);
const adminUrl=`postgresql://venda_local_migrator:${keys.dbAdmin}@127.0.0.1:55432/venda_flow_local`;
let admin;
for(let n=0;n<30;n++) {try {const candidate=new pg.Client({connectionString:adminUrl,connectionTimeoutMillis:1000});await candidate.connect();admin=candidate;break;}catch{await new Promise(r=>setTimeout(r,1000));}}
if(!admin) throw new Error('PostgreSQL local não ficou disponível. Credenciais omitidas.');
process.chdir(path.join(root,'venda-api'));
try {
  process.env.NODE_ENV='development';
  const {migrate}=await import(pathToFileURL(path.join(root,'venda-api/build/migrate.js')).href);
  await migrate(adminUrl);
  const found=await admin.query("SELECT rolname FROM pg_roles WHERE rolname='venda_app_local'");
  if(!found.rowCount) await admin.query(`CREATE ROLE venda_app_local LOGIN NOSUPERUSER NOBYPASSRLS INHERIT PASSWORD '${keys.dbApp}'`);
  await admin.query('GRANT venda_api TO venda_app_local');
  const worker=await admin.query("SELECT rolname FROM pg_roles WHERE rolname='venda_worker_local'");
  if(!worker.rowCount) await admin.query(`CREATE ROLE venda_worker_local LOGIN NOSUPERUSER NOBYPASSRLS INHERIT PASSWORD '${keys.dbWorker}'`);
  await admin.query('GRANT venda_worker TO venda_worker_local');
  fs.writeFileSync(path.join(dir,'worker.json'),JSON.stringify({NODE_ENV:'development',VENDA_WORKER_DATABASE_URL:`postgresql://venda_worker_local:${keys.dbWorker}@127.0.0.1:55432/venda_flow_local`},null,2),{mode:0o600});
}finally {await admin.end();process.chdir(root);}
const runtime={NODE_ENV:'development',VENDA_LOCAL_DEVELOPMENT:'true',PORT:'3201',DATABASE_URL:`postgresql://venda_app_local:${keys.dbApp}@127.0.0.1:55432/venda_flow_local`,DB_TLS:'false',API_ORIGIN:'http://127.0.0.1:3400',APP_ORIGIN:'http://127.0.0.1:3400',OIDC_ISSUER:'http://127.0.0.1:38080/realms/venda-flow-local',OIDC_CLIENT_ID:'venda-web-local',OIDC_CLIENT_SECRET:keys.client,SESSION_HASH_KEY:keys.session,FLOW_ENCRYPTION_KEY:keys.flow,CSRF_KEY:keys.csrf,VENDA_WEB_ORIGIN:'http://127.0.0.1:3400',VENDA_API_INTERNAL_ORIGIN:'http://127.0.0.1:3201',VENDA_WEB_LOCAL_DEVELOPMENT:'true'};
fs.writeFileSync(path.join(dir,'runtime.json'),JSON.stringify(runtime,null,2),{mode:0o600});
let identityReady=false;
for(let n=0;n<60;n++) {try{const response=await fetch(runtime.OIDC_ISSUER+'/.well-known/openid-configuration',{signal:AbortSignal.timeout(2000)});if(response.ok){identityReady=true;break;}}catch{} if(n%10===0) console.log('Aguardando o provedor OIDC real iniciar…'); await new Promise(r=>setTimeout(r,1000));}
if(!identityReady) throw new Error('OIDC local não ficou disponível. Nenhuma identidade simulada será usada.');
console.log('Serviços reais prontos. Nenhum usuário de aplicação ou registro comercial foi criado. Execute npm run start:local e crie sua conta pelo cadastro.');
