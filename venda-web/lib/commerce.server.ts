import 'server-only';
import { api,me,unwrap } from './api.server';
import { commercePaths,type CommerceKind,type CommerceItem } from './commerce';
export async function listCommerce(kind:CommerceKind,organizationId:string,q='',cursor?:string) {
  await me();
  const result=unwrap(await (await api()).GET(commercePaths[kind],{params:{query:{organizationId,q,limit:50,...(cursor?{cursor}:{})}}}));
  return {data:result.data as CommerceItem[],nextCursor:result.nextCursor};
}
export async function commercialOverview(organizationId:string) {
  await me();
  return unwrap(await (await api()).GET('/v1/reports/overview',{params:{query:{organizationId}}}));
}
