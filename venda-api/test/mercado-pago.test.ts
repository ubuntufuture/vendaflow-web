import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {MercadoPagoSandboxReadClient,sandboxCredentials,BillingProviderError} from '../src/billing/mercado-pago.js';
const demo=()=>({mode:'test',country:'BR',readOnly:true,accessToken:'TEST-DEMO-ONLY-ACCESS-TOKEN',publicKey:'TEST-DEMO-ONLY-PUBLIC-KEY'});
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const transport=(fn:(url:string,init:RequestInit)=>Promise<Response>)=>((input:Parameters<typeof fetch>[0],init:RequestInit)=>fn(String(input),init)) as typeof fetch;
describe('Mercado Pago — port de leitura sandbox, DEMO_ONLY',()=>{
 it('não classifica ambiente somente pelo prefixo e recusa escrita/produção',()=>{
  assert.equal(sandboxCredentials({...demo(),accessToken:'APP_USR-DEMO-ONLY-TOKEN'}).mode,'test');
  for(const input of [{...demo(),mode:'production'},{...demo(),readOnly:false},{...demo(),country:'AR'},{...demo(),accessToken:'TEST-DEMO_ONLY\r\nHeader: bad'}])assert.throws(()=>sandboxCredentials(input),/omitidos/);
 });
 it('fixa host HTTPS, impede redirect e expõe somente diagnóstico sem dados pessoais',async()=>{
  const client=new MercadoPagoSandboxReadClient(sandboxCredentials(demo()),transport(async(url,init)=>{
   assert.equal(url,'https://api.mercadopago.com/users/me');assert.equal(init.method,'GET');assert.equal(init.redirect,'error');assert.equal(init.cache,'no-store');
   return response({id:1,site_id:'MLB',tags:['test_user'],email:'DEMO_ONLY@example.test',secret:'DEMO_ONLY_SECRET'});
  }));
  const result=await client.inspectConnection();assert.equal(result.testAccountMarker,true);assert.equal(result.operations,'read_only');
  for(const value of ['email','DEMO_ONLY_SECRET','ACCESS-TOKEN'])assert.ok(!JSON.stringify(result).includes(value));
 });
 for(const [status,category] of [[401,'authentication'],[403,'permission'],[429,'rate_limit'],[503,'provider']] as const)it(`classifica HTTP ${status} sem registrar corpo ou repetir tentativa`,async()=>{
  let calls=0;const client=new MercadoPagoSandboxReadClient(sandboxCredentials(demo()),transport(async()=>{calls++;return response({message:'DEMO_ONLY_SECRET'},status);}));
  await assert.rejects(()=>client.inspectConnection(),error=>error instanceof BillingProviderError&&error.category===category&&!error.message.includes('DEMO_ONLY_SECRET'));assert.equal(calls,1);
 });
 it('distingue timeout e omite erros internos do transporte',async()=>{
  for(const [name,category] of [['TimeoutError','timeout'],['TypeError','network']]){
   const client=new MercadoPagoSandboxReadClient(sandboxCredentials(demo()),transport(async()=>{const error=new Error('DEMO_ONLY_SECRET');error.name=name!;throw error;}));
   await assert.rejects(()=>client.inspectConnection(),error=>error instanceof BillingProviderError&&error.category===category&&!error.message.includes('DEMO_ONLY_SECRET'));
  }
 });
 it('recusa payload inválido, conta de outro país e resposta excessiva',async()=>{
  for(const data of [null,{id:1,site_id:'MLA'},{id:'1',site_id:'MLB'},{id:1,site_id:'MLB',payload:'x'.repeat(140000)}]){
   const client=new MercadoPagoSandboxReadClient(sandboxCredentials(demo()),transport(async()=>response(data)));
   await assert.rejects(()=>client.inspectConnection(),BillingProviderError);
  }
 });
});
