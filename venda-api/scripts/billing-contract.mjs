export function billingContract(security){
 const id={type:'string',format:'uuid'},ref=name=>({$ref:'#/components/schemas/'+name});
 const response=schema=>({description:'Estado confirmado no backend; autorização de assinatura não comprova recebimento.',content:{'application/json':{schema}}});
 const errors=Object.fromEntries([400,401,403,404,409,503].map(code=>[code,response(ref('Error'))]));
 const org={name:'organizationId',in:'query',required:true,schema:id};
 const headers=[{name:'X-CSRF-Token',in:'header',required:true,schema:{type:'string'}},{name:'Idempotency-Key',in:'header',required:true,schema:{type:'string',minLength:16,maxLength:128}}];
 const schemas={
  BillingPlan:{type:'object',required:['id','name','code','version','environment','amountCents','currency','frequency','frequencyType','features','limits'],properties:{id,name:{type:'string'},code:{type:'string'},version:{type:'integer'},environment:{type:'string',enum:['test','production']},amountCents:{type:'integer'},currency:{type:'string',enum:['BRL']},frequency:{type:'integer'},frequencyType:{type:'string',enum:['days','months']},features:{type:'array',items:{type:'string'}},limits:{type:'object',additionalProperties:{type:'integer'}}}},
  BillingSubscription:{type:'object',required:['id','planId','environment','state','checkoutUrl','updatedAt'],properties:{id,planId:id,environment:{type:'string',enum:['test','production']},state:{type:'string',enum:['creating','pending_authorization','authorized','paused','cancellation_pending','cancelled','requires_review','failed']},checkoutUrl:{type:'string',format:'uri',nullable:true},updatedAt:{type:'string',format:'date-time'}}},
  BillingStatus:{type:'object',required:['environment','checkoutAvailable','reason','subscription','paymentVerified','entitlements'],properties:{environment:{type:'string',enum:['test','production']},checkoutAvailable:{type:'boolean'},reason:{type:'string',enum:['ready','provider_configuration_pending']},subscription:{...ref('BillingSubscription'),nullable:true},paymentVerified:{type:'boolean'},entitlements:{type:'object',required:['status','features'],properties:{status:{type:'string',enum:['unverified','active','inactive','revoked']},features:{type:'array',items:{type:'string',enum:['crm','whatsapp','ai','automations','reports']}}}}}},
  BillingIntent:{type:'object',required:['subscriptionId','commandId','accepted'],properties:{subscriptionId:id,commandId:id,accepted:{type:'boolean',enum:[true]}}},
  BillingCheckoutInput:{type:'object',additionalProperties:false,required:['planId','payerEmail'],properties:{planId:id,payerEmail:{type:'string',format:'email',maxLength:254}}}
 };
 schemas.BillingStatus.properties.subscription={...schemas.BillingSubscription,nullable:true};
 const paths={
  '/v1/billing/plans':{get:{operationId:'billingPlans',security,parameters:[org],responses:{200:response({type:'object',required:['data'],properties:{data:{type:'array',items:ref('BillingPlan')}}}),...errors}}},
  '/v1/billing/status':{get:{operationId:'billingStatus',security,parameters:[org],responses:{200:response(ref('BillingStatus')),...errors}}},
  '/v1/billing/checkout':{post:{operationId:'billingCheckout',security,parameters:[org,...headers],requestBody:{required:true,content:{'application/json':{schema:ref('BillingCheckoutInput')}}},responses:{202:response(ref('BillingIntent')),...errors}}}
 };
 for(const action of['cancel','reconcile'])paths['/v1/billing/subscriptions/{id}/'+action]={post:{operationId:'billing'+action,security,parameters:[org,...headers,{name:'id',in:'path',required:true,schema:id}],requestBody:{required:true,content:{'application/json':{schema:{type:'object',additionalProperties:false}}}},responses:{202:response(ref('BillingIntent')),...errors}}};
 return{paths,schemas};
}
