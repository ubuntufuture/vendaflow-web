// Start only the existing local identity server; does not apply DB migrations.
import fs from'node:fs';import path from'node:path';import{spawn}from'node:child_process';
const location=JSON.parse(fs.readFileSync(path.join(process.cwd(),'.local/runtime-location.json'),'utf8'));
const directory=path.resolve(location.directory),installation=JSON.parse(fs.readFileSync(path.join(directory,'installation.json'),'utf8'));
for(const name of['javaHome','keycloakHome'])if(!path.resolve(installation[name]).startsWith(directory+path.sep))throw new Error('Instalação fora do runtime autorizado.');
let ready=false;try{ready=(await fetch('http://127.0.0.1:38080/realms/master/.well-known/openid-configuration',{signal:AbortSignal.timeout(2000)})).ok;}catch{}
if(ready){console.log('Identidade local real já disponível.');process.exit(0);}
fs.mkdirSync(path.join(directory,'logs'),{recursive:true});const out=fs.openSync(path.join(directory,'logs/keycloak.log'),'a'),err=fs.openSync(path.join(directory,'logs/keycloak-error.log'),'a');
const child=spawn(process.env.ComSpec??'C:/Windows/System32/cmd.exe',['/d','/c',path.join(installation.keycloakHome,'bin/kc.bat'),'start-dev','--http-host=127.0.0.1','--http-port=38080','--hostname=http://127.0.0.1:38080'],{cwd:installation.keycloakHome,windowsHide:true,env:{OS:'Windows_NT',PATHEXT:process.env.PATHEXT,JAVA_HOME:installation.javaHome,PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:process.env.TEMP,TMP:process.env.TMP},stdio:['ignore',out,err]});
let exited=false;fs.closeSync(out);fs.closeSync(err);child.on('exit',code=>{exited=true;console.log('Identidade local encerrada: '+code);});
for(let attempt=0;attempt<240&&!ready&&!exited;attempt++){try{ready=(await fetch('http://127.0.0.1:38080/realms/master/.well-known/openid-configuration',{signal:AbortSignal.timeout(2000)})).ok;}catch{}if(!ready)await new Promise(resolve=>setTimeout(resolve,1000));}
if(!ready)throw new Error('Identidade não iniciou. Consulte os logs locais; nenhum simulador foi iniciado.');console.log('Keycloak real disponível em loopback.');
