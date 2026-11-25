import type { components } from './api.generated';
export type CommerceKind = 'contacts'|'opportunities'|'tasks'|'knowledge'|'workflows';
export type CommerceItem = components['schemas']['Contact'] | components['schemas']['Opportunity'] | components['schemas']['Task'] | components['schemas']['KnowledgeEntry'] | components['schemas']['Workflow'];
export type Overview = components['schemas']['CommercialOverview'];
export const commercePaths = {contacts:'/v1/contacts',opportunities:'/v1/opportunities',tasks:'/v1/tasks',knowledge:'/v1/knowledge',workflows:'/v1/workflows'} as const;
export const commerceSlugs:Record<CommerceKind,string>={contacts:'clientes',opportunities:'vendas',tasks:'tarefas',knowledge:'conhecimento',workflows:'automacoes'};
const slugKinds:Readonly<Record<string,CommerceKind>>={clientes:'contacts',vendas:'opportunities',tarefas:'tasks',conhecimento:'knowledge',automacoes:'workflows'};
export const kindForSlug = (slug:string):CommerceKind|undefined => slugKinds[slug];
export const stageLabels:Record<string,string>={new:'Novo',conversation:'Em conversa',proposal:'Proposta enviada',won:'Ganho',lost:'Perdido'};
export const names:Record<CommerceKind,string>={contacts:'Contatos',opportunities:'Oportunidades',tasks:'Tarefas',knowledge:'Conhecimento',workflows:'Automações'};
export function itemTitle(item:CommerceItem) {return 'name' in item?item.name:item.title;}
