import { listCommerce,commercialOverview } from '../lib/commerce.server';
import { kindForSlug,type CommerceItem } from '../lib/commerce';
import { CommerceScreen } from './commerce-screen.client';
import { Fault } from './ui';
import { WebFault } from '../lib/security';
import { ScreenCard } from './stitch-screens.client';
import Link from 'next/link';
import {CommercialHistory}from'./commercial-history';
export async function CommerceRoute({slug,organizationId,canMutate,canManageAutomation,timezone,query,cursor,from,to}: {slug:string;organizationId:string;canMutate:boolean;canManageAutomation:boolean;timezone:string;query?:string;cursor?:string;from?:string;to?:string}) {
  try {
    const kind=kindForSlug(slug);
    if(kind) {
      const [list,contacts,opportunities]=await Promise.all([listCommerce(kind,organizationId,query,cursor),['tasks','opportunities'].includes(kind)?listCommerce('contacts',organizationId):Promise.resolve({data:[] as CommerceItem[]}),kind==='tasks'?listCommerce('opportunities',organizationId):Promise.resolve({data:[] as CommerceItem[]})]);
      return <CommerceScreen kind={kind} organizationId={organizationId} autoCreate={slug==='automacoes/nova'} items={list.data} nextCursor={list.nextCursor} contacts={contacts.data} opportunities={opportunities.data} canMutate={canMutate} canManageAutomation={canManageAutomation} timezone={timezone}/>;
    }
    const result=await commercialOverview(organizationId);
    const monetary=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(result.proposalAmountCents/100);
    return <div className="st-page"><div className="st-metrics">{[['Contatos',result.contacts],['Oportunidades abertas',result.openOpportunities],['Tarefas pendentes',result.pendingTasks],['Valor em propostas',monetary]].map(([label,value])=><div className="st-metric" key={label}><span>{label}</span><strong>{value}</strong><small>Consultado no banco desta organização</small></div>)}</div><div className="st-columns"><ScreenCard title="Seu próximo passo"><div className="st-card-content st-detail"><Link href={`/app/o/${organizationId}/clientes`}>Gerenciar contatos</Link><Link href={`/app/o/${organizationId}/vendas`}>Acompanhar oportunidades</Link><Link href={`/app/o/${organizationId}/tarefas`}>Organizar tarefas</Link><Link href={`/app/o/${organizationId}/automacoes`}>Preparar automações</Link></div></ScreenCard><ScreenCard title="Receita confirmada"><div className="st-card-content"><strong>Não disponível</strong><p>Não há origem financeira de vendas integrada. Propostas e oportunidades ganhas não são apresentadas como receita recebida.</p></div></ScreenCard></div>{slug==='relatorios'&&<CommercialHistory organizationId={organizationId} {...(from?{from}:{})} {...(to?{to}:{})}/>}</div>;
  }catch(error){const fault=error instanceof WebFault?error:new WebFault(500);return <Fault status={fault.status} requestId={fault.requestId}/>;}
}
