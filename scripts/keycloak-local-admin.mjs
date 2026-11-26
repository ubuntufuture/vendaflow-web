// Local management of Venda Flow realms only. No token or response body is logged.
import fs from'node:fs';import path from'node:path';
export async function localIdentityAdmin(){
 const location=JSON.parse(fs.readFileSync(path.join(process.cwd(),'.local/runtime-location.json'),'utf8'));
 const keys=JSON.parse(fs.readFileSync(path.join(location.directory,'secrets.json'),'utf8'));
 const origin='http://127.0.0.1:38080';let token='';
 async function call(method,route,body,retry=true){
  if(!/^(serverinfo|realms(?:\/venda-flow-(?:local|admin-local)(?:\/.*)?)?)$/.test(route))throw new Error('Operação fora dos realms Venda Flow locais.');
  if(method==='POST'&&route==='realms'&&!['venda-flow-local','venda-flow-admin-local'].includes(body?.realm))throw new Error('Realm não autorizado.');
  if(!token){const response=await fetch(origin+'/realms/master/protocol/openid-connect/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'password',client_id:'admin-cli',username:'venda-local-admin',password:keys.identityAdmin}),signal:AbortSignal.timeout(45000)});if(!response.ok)throw new Error('Acesso administrativo local não confirmado.');token=(await response.json()).access_token;}
  const response=await fetch(origin+'/admin/'+route,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
  if(response.status===401&&retry){token='';return call(method,route,body,false);}return response;
 }
 return{directory:location.directory,call};
}
