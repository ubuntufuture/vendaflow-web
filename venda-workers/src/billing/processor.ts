import type {Pool} from 'pg';
import type {RecurringGatewayPort,ProviderSubscription} from '../../../venda-api/build/billing/subscriptions-client.js';
import {BillingProviderError} from '../../../venda-api/build/billing/mercado-pago.js';
export interface BillingJob {commandId:string;subscriptionId:string;organizationId:string;kind:'create'|'cancel'|'reconcile';attempt:number;providerId:string|null;environment:'test'|'production';payerEmail:string;amountCents:number;frequency:number;frequencyType:'days'|'months';reason:string;}
export async function processBillingOnce(pool:Pool,gateway:RecurringGatewayPort,environment:'test'|'production'){
 const row=await pool.query<{job:BillingJob|null}>('SELECT venda.claim_billing_command($1) AS job',[environment]);
 const job=row.rows[0]?.job;if(!job)return false;
 let result:ProviderSubscription;
 try{
  if(job.environment!==environment)throw new Error('environment_mismatch');
  if(job.kind==='create')result=await gateway.create({reference:job.subscriptionId,reason:job.reason,payerEmail:job.payerEmail,amountCents:Number(job.amountCents),frequency:job.frequency,frequencyType:job.frequencyType},job.commandId);
  else{if(!job.providerId)throw new Error('provider_unknown');result=job.kind==='cancel'?await gateway.cancel(job.providerId,job.subscriptionId,job.commandId):await gateway.get(job.providerId,job.subscriptionId);}
  if(result.reference!==job.subscriptionId||result.amountCents!==Number(job.amountCents)||result.currency!=='BRL'||result.frequency!==job.frequency||result.frequencyType!==job.frequencyType)throw new Error('provider_terms_mismatch');
 }catch(error){
  const code=error instanceof BillingProviderError?error.category:error instanceof Error&&['provider_unknown','provider_terms_mismatch','environment_mismatch'].includes(error.message)?error.message:'processing_failed';
  await pool.query('SELECT venda.finish_billing_command($1,$2,NULL,$3)',[job.commandId,job.attempt,code]);return true;
 }
 // A DB failure after an external write leaves the lease unresolved. Never repeat a create.
 await pool.query('SELECT venda.finish_billing_command($1,$2,$3::jsonb,NULL)',[job.commandId,job.attempt,JSON.stringify(result)]);return true;
}
