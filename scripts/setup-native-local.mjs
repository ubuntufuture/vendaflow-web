// Real native local services on the drive explicitly authorized by the user.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),dir=path.resolve('D:/VendaFlowAi-runtime');
for(const folder of ['downloads','java','keycloak','identity-import','logs']) fs.mkdirSync(path.join(dir,folder),{recursive:true});
const download=async(url,file,algorithm,checksum)=>{
  if(fs.existsSync(file)){if(createHash(algorithm).update(fs.readFileSync(file)).digest('hex')===checksum)return;throw new Error('Arquivo local existente diverge do checksum oficial.');}
  console.log(`Baixando ${path.basename(file)} para a unidade D…`);
  const response=await fetch(url,{signal:AbortSignal.timeout(1200000)});
  if(!response.ok||!response.body)throw new Error('Download oficial indisponível.');
  await pipeline(Readable.fromWeb(response.body),fs.createWriteStream(file+'.part'));
  if(createHash(algorithm).update(fs.readFileSync(file+'.part')).digest('hex')!==checksum)throw new Error('Checksum oficial inválido. Runtime não será executado.');
  fs.renameSync(file+'.part',file);
};
const run=(command,args,cwd=root)=>{const r=spawnSync(command,args,{cwd,windowsHide:true,stdio:'ignore',timeout:240000});if(r.status!==0)throw new Error(`Etapa local falhou: ${path.basename(command)}. Valores sensíveis omitidos.`);};
const extract=(archive,destination)=>run('powershell.exe',['-NoProfile','-ExecutionPolicy','RemoteSigned','-File',path.join(root,'scripts/extract-local.ps1'),'-Archive',archive,'-Destination',destination]);
const installFile=path.join(dir,'installation.json');
let installed=fs.existsSync(installFile)?JSON.parse(fs.readFileSync(installFile,'utf8')):null;
if(!installed){
  const javaResponse=await fetch('https://api.adoptium.net/v3/assets/latest/25/hotspot?architecture=x64&image_type=jdk&os=windows');
  if(!javaResponse.ok)throw new Error('Metadados oficiais do OpenJDK indisponíveis.');
  const assets=await javaResponse.json(),jdk=assets[0]?.binary?.package;
  if(!jdk||new URL(jdk.link).hostname!=='github.com'||!/^https:\/\/github.com\/adoptium\/temurin25-binaries\//.test(jdk.link)||!/^[a-f0-9]{64}$/.test(jdk.checksum))throw new Error('Metadados do JDK recusados.');
  const javaZip=path.join(dir,'downloads',jdk.name);await download(jdk.link,javaZip,'sha256',jdk.checksum);
  console.log('Extraindo OpenJDK 25 na unidade D…');extract(javaZip,path.join(dir,'java'));
  const javaHome=fs.readdirSync(path.join(dir,'java'),{withFileTypes:true}).find(d=>d.isDirectory()&&fs.existsSync(path.join(dir,'java',d.name,'bin/java.exe')))?.name;
  if(!javaHome)throw new Error('Java portátil não foi encontrado após extração.');
  const release=await fetch('https://api.github.com/repos/keycloak/keycloak/releases/tags/26.8.2',{headers:{Accept:'application/vnd.github+json'}});
  if(!release.ok)throw new Error('Release oficial do Keycloak indisponível.');
  const meta=await release.json(),asset=meta.assets.find(a=>a.name==='keycloak-26.8.2.zip');
  if(!asset||asset.browser_download_url!=='https://github.com/keycloak/keycloak/releases/download/26.8.2/keycloak-26.8.2.zip')throw new Error('Artefato do Keycloak recusado.');
  let algorithm='sha256',checksum=asset.digest?.replace(/^sha256:/,'');
  if(!/^[a-f0-9]{64}$/.test(checksum??'')) {const check=await fetch('https://github.com/keycloak/keycloak/releases/download/26.8.2/keycloak-26.8.2.zip.sha1');if(!check.ok)throw new Error('Checksum oficial indisponível');algorithm='sha1';checksum=(await check.text()).trim().split(/\s+/)[0];if(!/^[a-f0-9]{40}$/.test(checksum))throw new Error('Checksum recusado');}
  const keycloakZip=path.join(dir,'downloads',asset.name);await download(asset.browser_download_url,keycloakZip,algorithm,checksum);
  console.log('Extraindo Keycloak real na unidade D…');extract(keycloakZip,path.join(dir,'keycloak'));
  installed={javaHome:path.join(dir,'java',javaHome),keycloakHome:path.join(dir,'keycloak/keycloak-26.8.2'),javaSha256:jdk.checksum,keycloakChecksum:{algorithm,value:checksum}};
  fs.writeFileSync(installFile,JSON.stringify(installed,null,2));
}
const secret=()=>randomBytes(32).toString('hex'),keyFile=path.join(dir,'secrets.json'),oldKeys=path.join(root,'.local/secrets.json');
const keys=fs.existsSync(keyFile)?JSON.parse(fs.readFileSync(keyFile,'utf8')):fs.existsSync(oldKeys)?JSON.parse(fs.readFileSync(oldKeys,'utf8')):{dbAdmin:secret(),dbApp:secret(),identityAdmin:secret(),client:secret(),session:secret(),flow:secret(),csrf:secret()};
if(!keys.dbWorker)keys.dbWorker=secret();fs.writeFileSync(keyFile,JSON.stringify(keys,null,2),{mode:0o600});
const requireApi=createRequire(path.join(root,'venda-api/package.json'));
const binary=await import(pathToFileURL(requireApi.resolve('@embedded-postgres/windows-x64')).href),data=path.join(dir,'postgres-data');
if(!fs.existsSync(path.join(data,'PG_VERSION'))){
  const passwordFile=path.join(dir,'postgres-init-password');fs.writeFileSync(passwordFile,keys.dbAdmin,{mode:0o600});
  run(binary.initdb,['-D',data,'-U','venda_local_migrator','--pwfile',passwordFile,'--auth-host=scram-sha-256','--auth-local=scram-sha-256','--encoding=UTF8','--locale=C']);
  fs.unlinkSync(passwordFile);
}
const status=spawnSync(binary.pg_ctl,['-D',data,'status'],{stdio:'ignore',windowsHide:true});
if(status.status!==0)run(binary.pg_ctl,['-D',data,'-l',path.join(dir,'logs/postgres.log'),'-w','start','-o','-h 127.0.0.1 -p 55432 -c shared_buffers=32MB -c max_connections=30']);
const {default:pg}=await import(pathToFileURL(requireApi.resolve('pg')).href);
const admin=new pg.Client({connectionString:`postgresql://venda_local_migrator:${keys.dbAdmin}@127.0.0.1:55432/postgres`});await admin.connect();
if(!(await admin.query("SELECT 1 FROM pg_database WHERE datname='venda_flow_local'")).rowCount)await admin.query('CREATE DATABASE venda_flow_local');
await admin.end();
process.env.NODE_ENV='development';process.chdir(path.join(root,'venda-api'));
const {migrate}=await import(pathToFileURL(path.join(root,'venda-api/build/migrate.js')).href);
await migrate(`postgresql://venda_local_migrator:${keys.dbAdmin}@127.0.0.1:55432/venda_flow_local`);
const control=new pg.Client({connectionString:`postgresql://venda_local_migrator:${keys.dbAdmin}@127.0.0.1:55432/venda_flow_local`});await control.connect();
for(const [name,password,role] of [['venda_app_local',keys.dbApp,'venda_api'],['venda_worker_local',keys.dbWorker,'venda_worker']]){if(!(await control.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[name])).rowCount)await control.query(`CREATE ROLE ${name} LOGIN NOSUPERUSER NOBYPASSRLS INHERIT PASSWORD '${password}'`);await control.query(`GRANT ${role} TO ${name}`);}
const counts=await control.query('SELECT (SELECT count(*) FROM venda.users)::int AS users,(SELECT count(*) FROM venda.contacts)::int AS contacts');await control.end();process.chdir(root);
const realm={realm:'venda-flow-local',enabled:true,displayName:'Venda Flow AI — acesso local',sslRequired:'external',registrationAllowed:true,registrationEmailAsUsername:true,loginWithEmailAllowed:true,resetPasswordAllowed:false,verifyEmail:false,passwordPolicy:'length(12) and digits(1)',bruteForceProtected:true,clients:[{clientId:'venda-web-local',name:'Venda Flow AI local',enabled:true,protocol:'openid-connect',publicClient:false,secret:keys.client,standardFlowEnabled:true,directAccessGrantsEnabled:false,serviceAccountsEnabled:false,redirectUris:['http://127.0.0.1:3400/v1/auth/callback'],webOrigins:['http://127.0.0.1:3400'],attributes:{'pkce.code.challenge.method':'S256'}}]};
fs.mkdirSync(path.join(installed.keycloakHome,'data/import'),{recursive:true});fs.writeFileSync(path.join(installed.keycloakHome,'data/import/venda-flow-local-realm.json'),JSON.stringify(realm,null,2),{mode:0o600});
const theme=path.join(installed.keycloakHome,'themes/venda-flow/login');
fs.mkdirSync(path.join(theme,'resources/css'),{recursive:true});fs.mkdirSync(path.join(theme,'resources/img'),{recursive:true});fs.mkdirSync(path.join(theme,'resources/fonts'),{recursive:true});
fs.writeFileSync(path.join(theme,'theme.properties'),'parent=keycloak.v2\nimport=common/keycloak\nstyles=css/venda-flow.css\n');
fs.copyFileSync(path.join(root,'venda-web/public/brand/venda-flow-symbol.png'),path.join(theme,'resources/img/logo.png'));
fs.copyFileSync(path.join(root,'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'),path.join(theme,'resources/fonts/inter.woff2'));
fs.writeFileSync(path.join(theme,'resources/css/venda-flow.css'),"@font-face{font-family:Inter;src:url('../fonts/inter.woff2') format('woff2');font-weight:100 900;font-display:swap}body{font-family:Inter,sans-serif!important;background:#FFF9F6!important;color:#0B0E14}#kc-header-wrapper{font-size:0!important}#kc-header-wrapper:after{content:'Venda Flow AI';font-family:Inter,sans-serif;font-size:25px;font-weight:750;color:#0B0E14;background:url('../img/logo.png') no-repeat left center/42px;padding:12px 0 12px 52px}.pf-v5-c-login__main,.pf-v5-c-login__main-header,.pf-v5-c-login__main-body{background:#FFFFFF}.pf-v5-c-button.pf-m-primary{background:#FF6A4D;color:#0B0E14;border-radius:8px;font-family:Inter,sans-serif}");
let ready=false;try{ready=(await fetch('http://127.0.0.1:38080/realms/venda-flow-local/.well-known/openid-configuration',{signal:AbortSignal.timeout(2000)})).ok;}catch{}
if(!ready){
  const out=fs.openSync(path.join(dir,'logs/keycloak.log'),'a'),err=fs.openSync(path.join(dir,'logs/keycloak-error.log'),'a');
  const identityEnv={...process.env,JAVA_HOME:installed.javaHome,KC_BOOTSTRAP_ADMIN_USERNAME:'venda-local-admin',KC_BOOTSTRAP_ADMIN_PASSWORD:keys.identityAdmin};
  delete identityEnv.JAVA_OPTS;
  const child=spawn(process.env.ComSpec??'C:/Windows/System32/cmd.exe',['/d','/c',path.join(installed.keycloakHome,'bin/kc.bat'),'start-dev','--import-realm','--http-host=127.0.0.1','--http-port=38080','--hostname=http://127.0.0.1:38080'],{cwd:installed.keycloakHome,env:identityEnv,windowsHide:true,stdio:['ignore',out,err]});
  child.on('exit',code=>console.log(`Processo de identidade encerrado: ${code}.`));
  fs.closeSync(out);fs.closeSync(err);
}
for(let n=0;!ready&&n<600;n++){try{ready=(await fetch('http://127.0.0.1:38080/realms/venda-flow-local/.well-known/openid-configuration',{signal:AbortSignal.timeout(2000)})).ok;}catch{}if(n%30===0)console.log('Aguardando Keycloak real…');if(!ready)await new Promise(r=>setTimeout(r,1000));}
if(!ready)throw new Error('Keycloak não iniciou. Consulte os logs no runtime D. Não há fallback simulado.');
const tokenResponse=await fetch('http://127.0.0.1:38080/realms/master/protocol/openid-connect/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'password',client_id:'admin-cli',username:'venda-local-admin',password:keys.identityAdmin})});
if(!tokenResponse.ok)throw new Error('Configuração administrativa local não foi autenticada. Valores omitidos.');
const adminToken=(await tokenResponse.json()).access_token;
const configured=await fetch('http://127.0.0.1:38080/admin/realms/venda-flow-local',{method:'PUT',headers:{Authorization:`Bearer ${adminToken}`,'Content-Type':'application/json'},body:JSON.stringify({loginTheme:'venda-flow',internationalizationEnabled:true,supportedLocales:['pt-BR'],defaultLocale:'pt-BR'})});
if(!configured.ok)throw new Error('Tema/idioma da identidade local não foram confirmados.');
const runtime={NODE_ENV:'development',VENDA_LOCAL_DEVELOPMENT:'true',PORT:'3201',DATABASE_URL:`postgresql://venda_app_local:${keys.dbApp}@127.0.0.1:55432/venda_flow_local`,DB_TLS:'false',API_ORIGIN:'http://127.0.0.1:3400',APP_ORIGIN:'http://127.0.0.1:3400',OIDC_ISSUER:'http://127.0.0.1:38080/realms/venda-flow-local',OIDC_CLIENT_ID:'venda-web-local',OIDC_CLIENT_SECRET:keys.client,SESSION_HASH_KEY:keys.session,FLOW_ENCRYPTION_KEY:keys.flow,CSRF_KEY:keys.csrf,VENDA_WEB_ORIGIN:'http://127.0.0.1:3400',VENDA_API_INTERNAL_ORIGIN:'http://127.0.0.1:3201',VENDA_WEB_LOCAL_DEVELOPMENT:'true'};
fs.writeFileSync(path.join(dir,'runtime.json'),JSON.stringify(runtime,null,2),{mode:0o600});
fs.writeFileSync(path.join(dir,'worker.json'),JSON.stringify({NODE_ENV:'development',VENDA_WORKER_DATABASE_URL:`postgresql://venda_worker_local:${keys.dbWorker}@127.0.0.1:55432/venda_flow_local`},null,2),{mode:0o600});
fs.mkdirSync(path.join(root,'.local'),{recursive:true});fs.writeFileSync(path.join(root,'.local/runtime-location.json'),JSON.stringify({directory:dir}));
console.log(JSON.stringify({status:'ready',runtimeDirectory:dir,identity:'Keycloak real',database:'PostgreSQL real persistente',businessSeeds:false,applicationUsers:counts.rows[0].users,contacts:counts.rows[0].contacts}));
