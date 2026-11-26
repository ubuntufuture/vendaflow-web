// Read-only discovery; no message is sent and no account is bound automatically.
import fs from 'node:fs';import path from 'node:path';
const root=process.cwd(),location=JSON.parse(fs.readFileSync(path.join(root,'.local/runtime-location.json'),'utf8'));
const file=path.join(location.directory,'secrets.json'),keys=JSON.parse(fs.readFileSync(file,'utf8'));
const token=keys.whatsappSandbox?.accessToken;
if(typeof token!=='string'||!/^EAA[A-Za-z0-9]{50,}$/.test(token))throw new Error('Token WhatsApp não configurado; valores omitidos.');
const version='v26.0';
const suppliedWaba=process.env.VENDA_TEST_WABA_ID??keys.whatsappSandbox?.wabaId;
const suppliedPhone=process.env.VENDA_TEST_PHONE_NUMBER_ID??keys.whatsappSandbox?.phoneNumberId;
if([suppliedWaba,suppliedPhone].some(value=>value!==undefined&&!/^\d{5,25}$/.test(value)))throw new Error('Identificadores Meta inválidos; valores omitidos.');
async function get(route){
 try{const response=await fetch('https://graph.facebook.com/'+version+route,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000)});const reader=response.body?.getReader();if(!reader)return{ok:false,status:response.status,code:null};const chunks=[];let size=0;try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>131072){await reader.cancel();return{ok:false,status:response.status,code:null};}chunks.push(part.value);}const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));return{ok:response.ok,status:response.status,code:Number.isInteger(data.error?.code)?data.error.code:null,data:response.ok?data:null};}finally{reader.releaseLock();}}
 catch{return{ok:false,status:null,code:null};}
}
const profile=await get('/me?fields=id');
let businesses={ok:false,status:null,code:null},wabas=[],phoneIds=[];
if(profile.ok){businesses=await get('/me/businesses?fields=id&limit=10');if(businesses.ok){for(const business of (businesses.data?.data??[]).slice(0,10)){if(!/^\d+$/.test(String(business.id)))continue;const result=await get('/'+business.id+'/owned_whatsapp_business_accounts?fields=id&limit=10');if(result.ok)for(const account of(result.data?.data??[]).slice(0,10)){if(!/^\d+$/.test(String(account.id)))continue;wabas.push(String(account.id));const phones=await get('/'+account.id+'/phone_numbers?fields=id&limit=10');if(phones.ok)phoneIds.push(...(phones.data?.data??[]).map(phone=>String(phone.id)).filter(id=>/^\d+$/.test(id)));}}}}
let binding={attempted:false,verified:false,httpStatus:null,providerErrorCode:null};
if(suppliedWaba&&suppliedPhone){const phones=await get('/'+suppliedWaba+'/phone_numbers?fields=id&limit=100');binding={attempted:true,verified:phones.ok&&(phones.data?.data??[]).some(phone=>String(phone.id)===suppliedPhone),httpStatus:phones.status,providerErrorCode:phones.code};}
// Supplied IDs are configuration, never proof of a working connection.
if(suppliedWaba)keys.whatsappSandbox.wabaId=suppliedWaba;
if(suppliedPhone)keys.whatsappSandbox.phoneNumberId=suppliedPhone;
keys.whatsappSandbox.graphVersion=version;keys.whatsappSandbox.discoveredWabaIds=wabas;keys.whatsappSandbox.discoveredPhoneNumberIds=phoneIds;keys.whatsappSandbox.bindingVerified=binding.verified;keys.whatsappSandbox.checkedAt=new Date().toISOString();fs.writeFileSync(file,JSON.stringify(keys,null,2));
const evidence={checkedAt:new Date().toISOString(),provider:'Meta WhatsApp',graphVersion:version,accountAuthenticated:profile.ok,httpStatus:profile.status,providerErrorCode:profile.code,businessDiscovery:{available:businesses.ok,httpStatus:businesses.status,providerErrorCode:businesses.code},wabaCount:wabas.length,phoneNumberCount:phoneIds.length,binding,identifiersRecorded:false,credentialValuesRecorded:false,messagesSent:0,accountBound:false,modeSource:'user_confirmed_test_token',reference:'https://developers.facebook.com/docs/graph-api/reference/whats-app-business-account/phone_numbers/'};
fs.mkdirSync(path.join(root,'docs/finalizacao/evidencias'),{recursive:true});fs.writeFileSync(path.join(root,'docs/finalizacao/evidencias/whatsapp-conexao.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));if(!profile.ok||(binding.attempted&&!binding.verified))process.exitCode=1;
