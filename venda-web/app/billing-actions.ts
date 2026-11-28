"use server";
import {headers} from 'next/headers';
import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {api,me,unwrap} from '../lib/api.server';
import {settings,WebFault} from '../lib/security';
export type BillingFormState={status:'idle'|'accepted'|'error';message:string};
export async function requestBilling(context:{organizationId:string;key:string;kind:'checkout'|'cancel'|'reconcile';id?:string},_previous:BillingFormState,form:FormData):Promise<BillingFormState>{
 try{
  if((await headers()).get('origin')!==settings().appOrigin||!z.uuid().safeParse(context.organizationId).success||!z.uuid().safeParse(context.key).success)throw new WebFault(403);
  const actor=await me(),client=await api(),query={organizationId:context.organizationId},header={'X-CSRF-Token':actor.csrfToken,'Idempotency-Key':context.key};
  if(context.kind==='checkout'){
   const input=z.object({planId:z.uuid(),payerEmail:z.email().max(254)}).safeParse({planId:form.get('planId'),payerEmail:form.get('payerEmail')});
   if(!input.success||form.get('confirm')!=='on')return{status:'error',message:'Confira o plano, informe o e-mail do pagador e confirme a solicitação.'};
   unwrap(await client.POST('/v1/billing/checkout',{params:{query,header},body:input.data}));
  }else{
   if(!context.id||!z.uuid().safeParse(context.id).success||!['cancel','reconcile'].includes(context.kind)||context.kind==='cancel'&&form.get('confirm')!=='on')throw new WebFault(400);
   const route=context.kind==='cancel'?'/v1/billing/subscriptions/{id}/cancel':'/v1/billing/subscriptions/{id}/reconcile';
   unwrap(await client.POST(route,{params:{query,header,path:{id:context.id}},body:{}}));
  }
  revalidatePath('/app/o/'+context.organizationId+'/faturamento');
  return{status:'accepted',message:context.kind==='cancel'?'Pedido de cancelamento registrado. A confirmação será apresentada após processamento.':context.kind==='reconcile'?'Atualização solicitada. Consulte novamente após o processamento.':'Solicitação registrada. O checkout aparecerá quando o Mercado Pago confirmar sua criação.'};
 }catch(error){const status=error instanceof WebFault?error.status:500;return{status:'error',message:status===401?'Sua sessão expirou. Entre novamente.':status===403?'Seu acesso não permite alterar o faturamento.':status===409?'Há uma solicitação ou assinatura em andamento. Atualize a situação antes de tentar novamente.':status===400?'Revise os dados. No sandbox, use o e-mail de um comprador de teste do Mercado Pago.':status===503?'O checkout ainda depende da configuração do provedor e da URL HTTPS de retorno.':'Não foi possível registrar a solicitação. Os campos foram preservados.'};}
}
