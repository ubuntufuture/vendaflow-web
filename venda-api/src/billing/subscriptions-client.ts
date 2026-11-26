import {BillingProviderError}from'./mercado-pago.js';
export interface RecurringOffer {reference:string;reason:string;payerEmail:string;amountCents:number;frequency:number;frequencyType:'months'|'days';}
export interface ProviderSubscription {id:string;reference:string;status:'pending'|'authorized'|'paused'|'cancelled';checkoutUrl:string|null;updatedAt:string;nextPaymentAt:string|null;}
export interface RecurringGatewayPort {
 create(offer:RecurringOffer,key:string):Promise<ProviderSubscription>;
 get(id:string,expectedReference:string):Promise<ProviderSubscription>;
 cancel(id:string,expectedReference:string,key:string):Promise<ProviderSubscription>;
}
const identifier=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value);
const object=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const instant=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value)&&Number.isFinite(Date.parse(value));
/** Official hosted checkout: no card number/CVV or fabricated prices enter this port. */
export class MercadoPagoRecurringClient implements RecurringGatewayPort {
 #token:string;#collector:number|null=null;private readonly environment:'test'|'production';private readonly returnUrl:string;
 private failures=0;private blockedUntil=0;
 constructor(options:{environment:'test'|'production';accessToken:string;returnUrl:string},private readonly transport:typeof fetch=fetch){
  if(!['test','production'].includes(options.environment)||!/^(APP_USR|TEST)-[A-Za-z0-9-]{10,220}$/.test(options.accessToken))throw new Error('Configuração de assinatura inválida; valores omitidos.');
  let url:URL;try{url=new URL(options.returnUrl);}catch{throw new Error('URL de retorno inválida.');}
  if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search||url.port)throw new Error('URL de retorno HTTPS obrigatória.');
  this.#token=options.accessToken;this.environment=options.environment;this.returnUrl=options.returnUrl;
 }
 private async call(method:'GET'|'POST'|'PUT',route:string,body?:object,key?:string):Promise<Record<string,unknown>>{
  if(Date.now()<this.blockedUntil)throw new BillingProviderError('provider',503);
  let response:Response;
  try{response=await this.transport('https://api.mercadopago.com'+route,{method,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000),headers:{Authorization:`Bearer ${this.#token}`,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{}),...(key?{'X-Idempotency-Key':key}:{})},...(body?{body:JSON.stringify(body)}:{})});}
  catch(error){this.failure();throw new BillingProviderError(error instanceof Error&&['AbortError','TimeoutError'].includes(error.name)?'timeout':'network');}
  if(!response.ok){await response.body?.cancel().catch(()=>{});if(response.status>=500||response.status===429)this.failure();throw new BillingProviderError(response.status===401?'authentication':response.status===403?'permission':response.status===429?'rate_limit':'provider',response.status);}
  if(!(response.headers.get('content-type')??'').includes('application/json')){await response.body?.cancel().catch(()=>{});throw new BillingProviderError('invalid_response',response.status);}
  const reader=response.body?.getReader();if(!reader)throw new BillingProviderError('invalid_response',response.status);
  const parts:Uint8Array[]=[];let size=0;
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>131072){await reader.cancel();throw new BillingProviderError('invalid_response',response.status);}parts.push(part.value);}const data:unknown=JSON.parse(Buffer.concat(parts).toString('utf8'));if(!object(data))throw new BillingProviderError('invalid_response',response.status);this.failures=0;return data;}
  catch(error){if(error instanceof BillingProviderError)throw error;throw new BillingProviderError('invalid_response',response.status);}finally{reader.releaseLock();}
 }
 private failure(){if(++this.failures>=3){this.blockedUntil=Date.now()+30000;this.failures=0;}}
 private async account(){if(this.#collector!==null)return;const profile=await this.call('GET','/users/me');if(profile.site_id!=='MLB'||typeof profile.id!=='number'||!Number.isSafeInteger(profile.id)||profile.id<1||!Array.isArray(profile.tags)||profile.tags.includes('test_user')!==(this.environment==='test'))throw new BillingProviderError('permission',403);this.#collector=profile.id;}
 private view(data:Record<string,unknown>,reference:string):ProviderSubscription {
  if(!identifier(data.id)||data.external_reference!==reference||data.collector_id!==this.#collector||!['pending','authorized','paused','cancelled'].includes(String(data.status))||!instant(data.last_modified))throw new BillingProviderError('invalid_response');
  let checkoutUrl:string|null=null;
  if(data.init_point!==undefined&&data.init_point!==null){if(typeof data.init_point!=='string')throw new BillingProviderError('invalid_response');let url:URL;try{url=new URL(data.init_point);}catch{throw new BillingProviderError('invalid_response');}if(url.protocol!=='https:'||!['www.mercadopago.com.br','www.mercadopago.com'].includes(url.hostname)||url.username||url.password||url.port||url.pathname!=='/subscriptions/checkout')throw new BillingProviderError('invalid_response');checkoutUrl=url.href;}
  if(data.next_payment_date!==undefined&&data.next_payment_date!==null&&!instant(data.next_payment_date))throw new BillingProviderError('invalid_response');
  return{id:data.id,reference,status:data.status as ProviderSubscription['status'],checkoutUrl,updatedAt:data.last_modified,nextPaymentAt:typeof data.next_payment_date==='string'?data.next_payment_date:null};
 }
 async create(offer:RecurringOffer,key:string){
  if(!identifier(offer.reference)||!identifier(key)||key.length<16||!offer.reason.trim()||offer.reason.length>120||!Number.isSafeInteger(offer.amountCents)||offer.amountCents<1||offer.amountCents>9000000000000||!Number.isInteger(offer.frequency)||offer.frequency<1||offer.frequency>365||!['months','days'].includes(offer.frequencyType)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(offer.payerEmail)||offer.payerEmail.length>254)throw new Error('Oferta de assinatura inválida; valores omitidos.');
  if(this.environment==='test'&&!/@testuser\.com$/i.test(offer.payerEmail))throw new Error('Use um comprador de teste do Mercado Pago neste ambiente.');
  await this.account();
  return this.view(await this.call('POST','/preapproval',{reason:offer.reason,external_reference:offer.reference,payer_email:offer.payerEmail,status:'pending',back_url:this.returnUrl,auto_recurring:{frequency:offer.frequency,frequency_type:offer.frequencyType,transaction_amount:offer.amountCents/100,currency_id:'BRL'}},key),offer.reference);
 }
 async get(id:string,expectedReference:string){if(!identifier(id)||!identifier(expectedReference))throw new Error('Identificador inválido.');await this.account();return this.view(await this.call('GET','/preapproval/'+encodeURIComponent(id)),expectedReference);}
 async cancel(id:string,expectedReference:string,key:string){if(!identifier(key)||key.length<16)throw new Error('Intenção de cancelamento inválida.');const before=await this.get(id,expectedReference);if(before.status==='cancelled')return before;return this.view(await this.call('PUT','/preapproval/'+encodeURIComponent(id),{status:'cancelled'},key),expectedReference);}
}
