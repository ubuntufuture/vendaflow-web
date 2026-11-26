import {describe,it}from'node:test';
import assert from'node:assert/strict';
import{createHmac}from'node:crypto';
import{verifyMetaWebhook,verifyMercadoPagoWebhook}from'../src/integrations/webhook-signatures.js';
describe('DEMO_ONLY — assinaturas oficiais de webhook',()=>{
 const secret='DEMO_ONLY-segredo-de-webhook';
 it('Meta assina bytes exatos e rejeita body alterado, algoritmo e tamanho inválidos',()=>{
  const raw=Buffer.from('{ "object":"whatsapp_business_account" }'),signature='sha256='+createHmac('sha256',secret).update(raw).digest('hex');
  assert.equal(verifyMetaWebhook(raw,signature,secret),true);assert.equal(verifyMetaWebhook(Buffer.from(JSON.stringify(JSON.parse(raw.toString()))),signature,secret),false);
  for(const bad of [null,'sha1='+signature.slice(7),signature+'0','sha256=00'])assert.equal(verifyMetaWebhook(raw,bad,secret),false);
  assert.equal(verifyMetaWebhook(raw,signature,''),false);assert.equal(verifyMetaWebhook(Buffer.alloc(262145),signature,secret),false);
 });
 it('Mercado Pago valida ID normalizado, request-id e timestamp em segundos ou milissegundos',()=>{
  const now=1781009491000;for(const ts of [String(now),String(now/1000)]){
   const v1=createHmac('sha256',secret).update(`id:abc123;request-id:DEMO_ONLY;ts:${ts};`).digest('hex');
   const input={dataId:'ABC123',requestId:'DEMO_ONLY',signature:`ts=${ts},v1=${v1}`};
   assert.deepEqual(verifyMercadoPagoWebhook(input,secret,now),{resourceId:'abc123',timestamp:now});
   for(const change of [{dataId:'other'},{requestId:'OTHER'},{signature:`ts=${ts},v1=00`},{signature:`ts=${ts},ts=${ts}`},{signature:input.signature+',v1='+v1}])assert.equal(verifyMercadoPagoWebhook({...input,...change},secret,now),null);
   assert.equal(verifyMercadoPagoWebhook(input,secret,now+300001),null);
  }
 });
});
