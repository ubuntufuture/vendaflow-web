"use server";
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
z.config(z.locales.pt());
import { api,me,unwrap } from '../lib/api.server';
import { WebFault,settings,originAllowed,faultCopy } from '../lib/security';
import { commercePaths,commerceSlugs,type CommerceKind } from '../lib/commerce';
const nullable=(v:FormDataEntryValue|null)=>v===null||v===''?null:v;
const contact=z.object({name:z.string().trim().min(1).max(120),phone:z.string().regex(/^\+[1-9][0-9]{7,14}$/).nullable(),email:z.email().max(254).nullable()});
const opportunity=z.object({title:z.string().trim().min(1).max(160),stage:z.enum(['new','conversation','proposal','won','lost']),contactId:z.uuid().nullable(),amountCents:z.number().int().min(0).max(9000000000000).nullable()});
const task=z.object({title:z.string().trim().min(1).max(160),contactId:z.uuid().nullable(),opportunityId:z.uuid().nullable(),dueAt:z.iso.datetime({offset:true}).nullable(),completed:z.boolean()});
const knowledge=z.object({title:z.string().trim().min(1).max(160),content:z.string().trim().min(1).max(12000)});
const workflow=z.object({name:z.string().trim().min(1).max(120),trigger:z.enum(['opportunity.won','task.created']),taskTitle:z.string().trim().min(1).max(160)});
export type CommerceState={status:'idle'|'error'|'success';message:string;requestId?:string};
export type MutationContext={kind:CommerceKind;organizationId:string;id?:string;version?:number;key:string;archive?:boolean;workflowState?:'active'|'paused'};
export async function saveCommerce(context:MutationContext,_previous:CommerceState,form:FormData):Promise<CommerceState> {
  try {
    if(!originAllowed((await headers()).get('origin'),settings().appOrigin)) throw new WebFault(403);
    if(!Object.hasOwn(commercePaths,context.kind)||!z.uuid().safeParse(context.organizationId).success||!z.uuid().safeParse(context.key).success||context.id!==undefined&&!z.uuid().safeParse(context.id).success) throw new WebFault(400);
    const session=await me(), client=await api();
    const auth={'X-CSRF-Token':session.csrfToken,'Idempotency-Key':context.key};
    const query={organizationId:context.organizationId};
    if(context.workflowState) {
      if(context.kind!=='workflows'||!context.id||!Number.isInteger(context.version)||context.version!<1||!['active','paused'].includes(context.workflowState)) throw new WebFault(400);
      const path=context.workflowState==='active'?'/v1/workflows/{id}/activate':'/v1/workflows/{id}/pause';
      unwrap(await client.POST(path,{params:{query,path:{id:context.id},header:{...auth,'If-Match':String(context.version)}},body:{}}));
    } else if(context.archive) {
      if(!context.id||!Number.isInteger(context.version)||context.version!<1) throw new WebFault(400);
      const path=`${commercePaths[context.kind]}/{id}/archive` as const;
      unwrap(await client.POST(path,{params:{query,path:{id:context.id},header:{...auth,'If-Match':String(context.version)}},body:{}}));
    } else {
      const amount=nullable(form.get('amountCents'));
      const parsed = context.kind==='contacts'?contact.safeParse({name:form.get('name'),phone:nullable(form.get('phone')),email:nullable(form.get('email'))}):context.kind==='opportunities'?opportunity.safeParse({title:form.get('title'),stage:form.get('stage'),contactId:nullable(form.get('contactId')),amountCents:amount===null?null:Number(amount)}):context.kind==='tasks'?task.safeParse({title:form.get('title'),contactId:nullable(form.get('contactId')),opportunityId:nullable(form.get('opportunityId')),dueAt:nullable(form.get('dueAt')),completed:form.get('completed')==='on'}):context.kind==='knowledge'?knowledge.safeParse({title:form.get('title'),content:form.get('content')}):workflow.safeParse({name:form.get('name'),trigger:form.get('trigger'),taskTitle:form.get('taskTitle')});
      if(!parsed.success) return {status:'error',message:'Revise os campos: '+parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')};
      // Each operation is checked against the generated OpenAPI method before transport.
      const body=parsed.data;
      if(context.id) {
        if(!Number.isInteger(context.version)||context.version!<1) throw new WebFault(400);
        const params={query,path:{id:context.id},header:{...auth,'If-Match':String(context.version)}};
        if(context.kind==='contacts') unwrap(await client.PATCH('/v1/contacts/{id}',{params,body:contact.parse(body)}));
        else if(context.kind==='opportunities') unwrap(await client.PATCH('/v1/opportunities/{id}',{params,body:opportunity.parse(body)}));
        else if(context.kind==='tasks') unwrap(await client.PATCH('/v1/tasks/{id}',{params,body:task.parse(body)}));
        else if(context.kind==='knowledge') unwrap(await client.PATCH('/v1/knowledge/{id}',{params,body:knowledge.parse(body)}));
        else unwrap(await client.PATCH('/v1/workflows/{id}',{params,body:workflow.parse(body)}));
      } else {
        const params={query,header:auth};
        if(context.kind==='contacts') unwrap(await client.POST('/v1/contacts',{params,body:contact.parse(body)}));
        else if(context.kind==='opportunities') unwrap(await client.POST('/v1/opportunities',{params,body:opportunity.parse(body)}));
        else if(context.kind==='tasks') unwrap(await client.POST('/v1/tasks',{params,body:task.parse(body)}));
        else if(context.kind==='knowledge') unwrap(await client.POST('/v1/knowledge',{params,body:knowledge.parse(body)}));
        else unwrap(await client.POST('/v1/workflows',{params,body:workflow.parse(body)}));
      }
    }
    revalidatePath(`/app/o/${context.organizationId}`,'layout');
    revalidatePath(`/app/o/${context.organizationId}/${commerceSlugs[context.kind]}`);
    return {status:'success',message:context.workflowState==='active'?'Automação ativada. As execuções serão confirmadas nos recibos do worker.':context.workflowState==='paused'?'Automação pausada.':context.archive?'Registro arquivado no banco.':'Registro confirmado no banco.'};
  } catch(error) {
    const fault=error instanceof WebFault?error:new WebFault(500);
    return {status:'error',message:fault.status===409?'O registro mudou ou a intenção de gravação conflitou. Atualize a consulta antes de tentar novamente.':(faultCopy[fault.status]??faultCopy[500]!).description,...(fault.requestId?{requestId:fault.requestId}:{})};
  }
}
export async function getWorkflowExecutions(organizationId:string,id:string) {
  if(!originAllowed((await headers()).get('origin'),settings().appOrigin)||!z.uuid().safeParse(organizationId).success||!z.uuid().safeParse(id).success) throw new WebFault(403);
  await me();
  return unwrap(await (await api()).GET('/v1/workflows/{id}/executions',{params:{query:{organizationId},path:{id}}})).data;
}
