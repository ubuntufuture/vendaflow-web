import {api,me,unwrap} from '../../../../../lib/api.server';
import {z} from 'zod';
import {WebFault} from '../../../../../lib/security';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){
 const noStore={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"};
 try{const{id}=await context.params,organizationId=new URL(request.url).searchParams.get('organizationId');if(!z.uuid().safeParse(id).success||!z.uuid().safeParse(organizationId).success)return Response.json({message:'Solicitação inválida.'},{status:400,headers:noStore});await me();const result=unwrap(await(await api()).GET('/v1/privacy/requests/{id}/export',{params:{path:{id},query:{organizationId:organizationId!}}}));return new Response(JSON.stringify(result,null,2),{headers:{...noStore,'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="venda-flow-exportacao.json"'}});}catch(error){const status=error instanceof WebFault?error.status:500;return Response.json({message:'Não foi possível exportar os dados autorizados.'},{status,headers:noStore});}
}
