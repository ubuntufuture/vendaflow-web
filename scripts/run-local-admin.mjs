import fs from'node:fs';import path from'node:path';import{spawn}from'node:child_process';
const root=process.cwd(),directory=JSON.parse(fs.readFileSync('.local/runtime-location.json','utf8')).directory;
const load=name=>JSON.parse(fs.readFileSync(path.join(directory,name),'utf8')),api=load('admin-runtime.json'),web=load('admin-web.json');
if(api.ADMIN_WEB_ORIGIN!=='http://127.0.0.1:3401'||web.ADMIN_API_INTERNAL_ORIGIN!=='http://127.0.0.1:3202'||api.ADMIN_OIDC_ISSUER!=='http://127.0.0.1:38080/realms/venda-flow-admin-local')throw new Error('Launcher interno exclusivo para loopback.');
const base=Object.fromEntries(['OS','PATH','PATHEXT','SystemRoot','TEMP','TMP'].filter(k=>process.env[k]).map(k=>[k,process.env[k]])),children=[];
function start(args,cwd,env){const child=spawn(process.execPath,args,{cwd,env:{...base,...env},windowsHide:true,stdio:['ignore','inherit','inherit']});children.push(child);child.on('error',()=>{console.error('Não foi possível iniciar o serviço interno.');close();});child.on('exit',code=>{if(code)console.error('Serviço interno encerrou com falha.');close();});}
let closing=false;function close(){if(closing)return;closing=true;for(const child of children)child.kill('SIGTERM');}
process.once('SIGINT',close);process.once('SIGTERM',close);
start(['build/main.js'],path.join(root,'venda-admin-api'),api);
let ready=false;for(let attempt=0;attempt<30&&!closing;attempt++){try{ready=(await fetch('http://127.0.0.1:3202/ready',{signal:AbortSignal.timeout(2000)})).ok;}catch{}if(ready)break;await new Promise(resolve=>setTimeout(resolve,1000));}
if(!ready){close();throw new Error('Banco/isolamento interno não estão prontos. Nenhum simulador foi iniciado.');}
start([path.join(root,'node_modules/next/dist/bin/next'),'start',path.join(root,'venda-admin'),'--hostname','127.0.0.1','--port','3401'],root,web);
console.log('Console interno: http://127.0.0.1:3401 — senha pessoal e TOTP obrigatórios.');
