// DEMO_ONLY: real Keycloak, isolated temporary realm, no product identities or records.
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
export async function realKeycloakFixture(root,appOrigin){
 const location=JSON.parse(fs.readFileSync(path.join(root,'.local/runtime-location.json'),'utf8'));
 const keys=JSON.parse(fs.readFileSync(path.join(location.directory,'secrets.json'),'utf8'));
 const origin='http://127.0.0.1:38080',realm='venda-flow-tests-'+randomUUID(),clientId='venda-browser-test',clientSecret=randomBytes(32).toString('hex'),password=randomBytes(24).toString('base64url');
 let token='';
 async function admin(route,init={},retry=true){
  if(!token){const response=await fetch(origin+'/realms/master/protocol/openid-connect/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'password',client_id:'admin-cli',username:'venda-local-admin',password:keys.identityAdmin})});if(!response.ok)throw new Error('Keycloak real não autenticou a fixture administrativa.');token=(await response.json()).access_token;}
  const response=await fetch(origin+'/admin/'+route,{...init,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...init.headers}});if(response.status===401&&retry){token='';return admin(route,init,false);}if(!response.ok)throw new Error(`Keycloak real: operação de teste não confirmada (${response.status}).`);return response;
 }
 await admin('realms',{method:'POST',body:JSON.stringify({realm,enabled:true,sslRequired:'external',registrationAllowed:false,internationalizationEnabled:true,defaultLocale:'pt-BR',supportedLocales:['pt-BR'],loginTheme:'venda-flow',clients:[{clientId,enabled:true,protocol:'openid-connect',publicClient:false,secret:clientSecret,standardFlowEnabled:true,directAccessGrantsEnabled:false,redirectUris:[appOrigin+'/v1/auth/callback'],attributes:{'pkce.code.challenge.method':'S256'}}]})});
 const subjects=new Map();
 return {issuer:`${origin}/realms/${realm}`,clientId,clientSecret,real:true,password,
  async select(username){if(subjects.has(username))return;const response=await admin(`realms/${realm}/users`,{method:'POST',body:JSON.stringify({username,firstName:'DEMO_ONLY',lastName:'Teste',email:username.toLowerCase()+'@example.test',enabled:true,requiredActions:[],emailVerified:false,credentials:[{type:'password',value:password,temporary:false}]})});const id=response.headers.get('location')?.split('/').at(-1);if(!id)throw new Error('Identidade de teste não foi confirmada.');subjects.set(username,id);},
  subject(username){return subjects.get(username);},
  async close(){if(!/^venda-flow-tests-[0-9a-f-]{36}$/.test(realm))throw new Error('Limpeza do realm recusada.');await admin(`realms/${realm}`,{method:'DELETE'});}
 };
}
