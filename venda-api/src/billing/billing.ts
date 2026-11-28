import {BadRequestException,ConflictException,ForbiddenException,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import {IsEmail,IsUUID,MaxLength} from 'class-validator';
import {createHash,randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {AuthService,type Principal} from '../auth.js';
import {membership,uuid} from '../policy.js';
import {recordChange} from '../events.js';

export class CheckoutInput {
 @IsUUID() planId!:string;
 @IsEmail() @MaxLength(254) payerEmail!:string;
}
type Row=Record<string,unknown>;
function subscriptionView(row:Row){return{id:row.id,planId:row.plan_id,environment:row.environment,state:row.state,checkoutUrl:row.checkout_url,updatedAt:(row.updated_at as Date).toISOString()};}
export class BillingService {
 constructor(private readonly auth:AuthService){}
 private tx<T>(actor:Principal,org:string,fn:(client:PoolClient)=>Promise<T>){
  uuid(org);return this.auth.db.tx({userId:actor.userId,sessionHash:actor.sessionHash,organizationId:org},async client=>{
   await this.auth.activeInTransaction(client,actor);const role=await membership(client,actor.userId,org);
   if(!['owner','admin','billing'].includes(role))throw new ForbiddenException();
   await client.query("SELECT set_config('venda.billing_environment',$1,true)",[this.auth.config.billingEnvironment]);return fn(client);
  });
 }
 private async once<T>(client:PoolClient,actor:Principal,org:string,scope:string,key:unknown,body:object,fn:()=>Promise<T>){
  if(typeof key!=='string'||!/^[A-Za-z0-9_-]{16,128}$/.test(key))throw new BadRequestException();
  const hash=createHash('sha256').update(JSON.stringify(body,Object.keys(body).sort())).digest('hex');
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`venda.billing.intent:${org}:${actor.userId}:${scope}:${key}`]);
  const previous=(await client.query('SELECT request_hash,result FROM venda.billing_idempotency WHERE organization_id=$1 AND actor_id=$2 AND scope=$3 AND key=$4',[org,actor.userId,scope,key])).rows[0];
  if(previous){if(previous.request_hash!==hash)throw new ConflictException();return previous.result as T;}
  const result=await fn();await client.query('INSERT INTO venda.billing_idempotency(organization_id,actor_id,scope,key,request_hash,result) VALUES($1,$2,$3,$4,$5,$6)',[org,actor.userId,scope,key,hash,JSON.stringify(result)]);return result;
 }
 plans(actor:Principal,org:string){return this.tx(actor,org,async client=>({data:(await client.query("SELECT id,code,name,version,environment,amount_cents,currency,frequency,frequency_type,features,limits FROM venda_admin.plan_versions WHERE status='published' AND environment=$1 ORDER BY code LIMIT 200",[this.auth.config.billingEnvironment])).rows.map(row=>({id:row.id,code:row.code,name:row.name,version:row.version,environment:row.environment,amountCents:Number(row.amount_cents),currency:row.currency,frequency:row.frequency,frequencyType:row.frequency_type,features:row.features,limits:row.limits}))}));}
 status(actor:Principal,org:string){return this.tx(actor,org,async client=>{
  const subscription=(await client.query('SELECT id,plan_id,environment,state,checkout_url,updated_at FROM venda.billing_subscriptions WHERE organization_id=$1 AND environment=$2 ORDER BY created_at DESC,id DESC LIMIT 1',[org,this.auth.config.billingEnvironment])).rows[0];
  return{environment:this.auth.config.billingEnvironment,checkoutAvailable:this.auth.config.billingEnabled,reason:this.auth.config.billingEnabled?'ready':'provider_configuration_pending',subscription:subscription?subscriptionView(subscription):null,paymentVerified:false,entitlements:{status:'unverified',features:[] as string[]}};
 });}
 checkout(actor:Principal,org:string,input:CheckoutInput,key:unknown,requestId:string){return this.tx(actor,org,client=>this.once(client,actor,org,'checkout',key,input,async()=>{
  if(!this.auth.config.billingEnabled)throw new ServiceUnavailableException();
  if(this.auth.config.billingEnvironment==='test'&&!/@testuser\.com$/i.test(input.payerEmail))throw new BadRequestException();
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`venda.billing.org:${org}`]);
  const plan=(await client.query("SELECT id,code FROM venda_admin.plan_versions WHERE id=$1 AND environment=$2 AND status='published'",[uuid(input.planId),this.auth.config.billingEnvironment])).rows[0];if(!plan)throw new NotFoundException();
  await client.query('SELECT pg_advisory_xact_lock_shared(hashtextextended($1,0))',['admin.plan.'+plan.code]);
  if(!(await client.query("SELECT 1 FROM venda_admin.plan_versions WHERE id=$1 AND status='published'",[plan.id])).rowCount)throw new NotFoundException();
  if((await client.query("SELECT 1 FROM venda.billing_subscriptions WHERE organization_id=$1 AND environment=$2 AND state NOT IN ('cancelled','failed')",[org,this.auth.config.billingEnvironment])).rowCount)throw new ConflictException();
  const id=randomUUID();await client.query('INSERT INTO venda.billing_subscriptions(id,organization_id,plan_id,environment,created_by,payer_email) VALUES($1,$2,$3,$4,$5,$6)',[id,org,plan.id,this.auth.config.billingEnvironment,actor.userId,input.payerEmail]);
  const command=(await client.query("INSERT INTO venda.billing_commands(organization_id,subscription_id,actor_id,kind,request_id) VALUES($1,$2,$3,'create',$4) RETURNING id",[org,id,actor.userId,requestId])).rows[0];
  await recordChange(client,org,actor.userId,'billing.checkout.requested',id,requestId);return{subscriptionId:id,commandId:command.id,accepted:true};
 }));}
 command(actor:Principal,org:string,id:string,kind:'cancel'|'reconcile',key:unknown,requestId:string){
  uuid(id);return this.tx(actor,org,client=>this.once(client,actor,org,kind,key,{subscriptionId:id},async()=>{
   const current=(await client.query('SELECT * FROM venda.billing_subscriptions WHERE organization_id=$1 AND id=$2 AND environment=$3 FOR UPDATE',[org,id,this.auth.config.billingEnvironment])).rows[0];if(!current)throw new NotFoundException();
   if(['cancelled','failed'].includes(current.state))throw new ConflictException();
   if(kind==='reconcile'&&!this.auth.config.billingEnabled)throw new ServiceUnavailableException();
   if(kind==='cancel')await client.query("UPDATE venda.billing_subscriptions SET state='cancellation_pending',updated_at=clock_timestamp() WHERE id=$1",[id]);
   const inserted=await client.query('INSERT INTO venda.billing_commands(organization_id,subscription_id,actor_id,kind,request_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id',[org,id,actor.userId,kind,requestId]);
   const command=inserted.rows[0]??(await client.query("SELECT id FROM venda.billing_commands WHERE organization_id=$1 AND subscription_id=$2 AND kind=$3 AND state IN ('queued','processing','retry')",[org,id,kind])).rows[0];
   if(!command)throw new ConflictException();await recordChange(client,org,actor.userId,kind==='cancel'?'billing.cancel.requested':'billing.reconcile.requested',id,requestId);
   return{subscriptionId:id,commandId:command.id,accepted:true};
  }));
 }
}
