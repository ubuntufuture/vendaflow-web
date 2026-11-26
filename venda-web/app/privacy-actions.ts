"use server";
import {headers} from 'next/headers';
import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {api,me,unwrap} from '../lib/api.server';
import {originAllowed,settings,WebFault,faultCopy} from '../lib/security';
import type {CommerceState} from './commerce-actions';
const reference=z.string().trim().min(1).max(240);
const consent=z.object({contactId:z.uuid(),purpose:z.enum(['service','marketing']),channel:z.enum(['whatsapp','email']),status:z.enum(['granted','revoked']),lawfulBasis:z.enum(['consent','contract','legal_obligation','legitimate_interest']),noticeVersion:z.string().trim().min(1).max(64),sourceReference:reference});
const request=z.object({contactId:z.uuid(),kind:z.enum(['access','export','erasure']),sourceReference:reference});
export async function savePrivacy(context:{organizationId:string;key:string;kind:'consent'|'request'},_previous:CommerceState,form:FormData):Promise<CommerceState>{
 try{
  if(!originAllowed((await headers()).get('origin'),settings().appOrigin))throw new WebFault(403);
  if(!z.uuid().safeParse(context.organizationId).success||!z.uuid().safeParse(context.key).success)throw new WebFault(400);
  const session=await me(),client=await api();const params={query:{organizationId:context.organizationId},header:{'X-CSRF-Token':session.csrfToken,'Idempotency-Key':context.key}};
  const raw=Object.fromEntries(form.entries());
  if(context.kind==='consent'){const parsed=consent.safeParse(raw);if(!parsed.success)return{status:'error',message:'Confira os campos e a referência da evidência.'};unwrap(await client.POST('/v1/consents',{params,body:parsed.data}));}
  else if(context.kind==='request'){const parsed=request.safeParse(raw);if(!parsed.success)return{status:'error',message:'Confira o contato, o tipo e a referência da solicitação.'};unwrap(await client.POST('/v1/privacy/requests',{params,body:parsed.data}));}
  else throw new WebFault(400);
  revalidatePath(`/app/o/${context.organizationId}/configuracoes/privacidade`);return{status:'success',message:context.kind==='consent'?'Registro de privacidade salvo.':'Solicitação registrada para análise.'};
 }catch(error){const fault=error instanceof WebFault?error:new WebFault(500);return{status:'error',message:(faultCopy[fault.status]??faultCopy[500]!).description,...(fault.requestId?{requestId:fault.requestId}:{})};}
}
