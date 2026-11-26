import{describe,it}from'node:test';import assert from'node:assert/strict';import{MercadoPagoRecurringClient}from'../src/billing/subscriptions-client.js';import{BillingProviderError}from'../src/billing/mercado-pago.js';
// DEMO_ONLY fixtures. Never imported by the runtime or used as a price catalog.
const options={environment:'test' as const,accessToken:'TEST-DEMO-ONLY-CREDENTIAL',returnUrl:'https://app.example.test/faturamento/retorno'};
const offer={reference:'DEMO_ONLY-local-reference',reason:'DEMO_ONLY cenário de contrato',payerEmail:'DEMO_ONLY@testuser.com',amountCents:12345,frequency:1,frequencyType:'months' as const};
const subscription={id:'DEMO_ONLY-provider-id',external_reference:offer.reference,collector_id:1,status:'pending',last_modified:'2026-11-25T10:00:00Z',init_point:'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=DEMO_ONLY'};
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const transport=(fn:(url:string,init:RequestInit)=>Promise<Response>)=>((url:Parameters<typeof fetch>[0],init:RequestInit)=>fn(String(url),init))as typeof fetch;
describe('DEMO_ONLY — assinaturas recorrentes Mercado Pago',()=>{
 it('cria checkout pendente com valor em centavos e chave estável, sem enviar dados de cartão',async()=>{
  const calls:{url:string;init:RequestInit}[]=[];const client=new MercadoPagoRecurringClient(options,transport(async(url,init)=>{calls.push({url,init});return response(url.endsWith('/users/me')?{id:1,site_id:'MLB',tags:['test_user']}:subscription);}));
  const result=await client.create(offer,'DEMO_ONLY-intention-key');assert.equal(result.status,'pending');assert.equal(calls.length,2);assert.equal(calls[1]!.url,'https://api.mercadopago.com/preapproval');const body=JSON.parse(String(calls[1]!.init.body));assert.equal(body.auto_recurring.transaction_amount,123.45);assert.equal(body.auto_recurring.currency_id,'BRL');assert.equal(body.status,'pending');assert.equal(calls[1]!.init.redirect,'error');assert(!('card_token_id'in body));
 });
 it('recusa ambiente incoerente, comprador real em sandbox e preço inválido antes de criar cobrança',async()=>{
  let calls=0;const client=new MercadoPagoRecurringClient(options,transport(async()=>{calls++;return response({id:1,site_id:'MLB',tags:[]});}));
  await assert.rejects(()=>client.create({...offer,amountCents:0},'DEMO_ONLY-intention-key'));await assert.rejects(()=>client.create({...offer,payerEmail:'demo@example.test'},'DEMO_ONLY-intention-key'));assert.equal(calls,0);
  await assert.rejects(()=>client.create(offer,'DEMO_ONLY-intention-key'),BillingProviderError);assert.equal(calls,1);
 });
 it('vincula recurso ao recebedor e referência local e recusa URLs de checkout externas',async()=>{
  for(const change of [{collector_id:2},{external_reference:'DEMO_ONLY-other-tenant'},{init_point:'https://invasor.invalid/subscriptions/checkout'},{init_point:'https://www.mercadopago.com.br@invasor.invalid/subscriptions/checkout'}]){
   const client=new MercadoPagoRecurringClient(options,transport(async url=>response(url.endsWith('/users/me')?{id:1,site_id:'MLB',tags:['test_user']}:{...subscription,...change})));
   await assert.rejects(()=>client.get(subscription.id,offer.reference),BillingProviderError);
  }
 });
 it('consulta antes de cancelar e não repete cancelamento já confirmado',async()=>{
  let writes=0;const client=new MercadoPagoRecurringClient(options,transport(async(url,init)=>{if(init.method!=='GET')writes++;return response(url.endsWith('/users/me')?{id:1,site_id:'MLB',tags:['test_user']}:{...subscription,status:'cancelled'});}));assert.equal((await client.cancel(subscription.id,offer.reference,'DEMO_ONLY-intention-key')).status,'cancelled');assert.equal(writes,0);
 });
 it('não repete POST após timeout ambíguo nem expõe resposta do provedor',async()=>{
  let posts=0;const client=new MercadoPagoRecurringClient(options,transport(async(url,init)=>{if(url.endsWith('/users/me'))return response({id:1,site_id:'MLB',tags:['test_user']});if(init.method==='POST')posts++;const error=new Error('DEMO_ONLY segredo');error.name='TimeoutError';throw error;}));await assert.rejects(()=>client.create(offer,'DEMO_ONLY-intention-key'),error=>error instanceof BillingProviderError&&error.category==='timeout'&&!error.message.includes('segredo'));assert.equal(posts,1);
 });
});
