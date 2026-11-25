import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Gera somente documentação. Não importa nem executa HTML de terceiros.
const base = 'referencias/stitch_venda_flow_design_system';
const out = 'docs/ux';
const states = ['loading', 'empty', 'error', 'forbidden', 'timeout', 'success', 'stale'];
const rows = [
  ['PUB01','public','/','Início público','P0','WF01',['visitante'],'US01'],
  ['PUB02','public','/planos','Planos','P0','WF01',['visitante'],'US01'],
  ['PUB03','public','/entrar','Entrar','P0','WF02',['visitante'],'US02'],
  ['PUB04','public','/cadastro','Criar conta','P0','WF02',['visitante'],'US02'],
  ['PUB05','public','/privacidade','Privacidade','P0','WF01',['visitante'],'US14'],
  ['PUB06','public','/termos','Termos','P0','WF01',['visitante'],'US01'],
  ['AUTH01','public','/auth/callback','Retorno OIDC cliente','P0','WF02',['visitante'],'US02'],
  ['APP01','app','/configurar','Primeiros passos','P0','WF03',['responsavel'],'US03'],
  ['APP02','app','/app','Início operacional','P0','WF04',['responsavel','gestor','atendente'],'US05'],
  ['APP03','app','/app/conversas','Conversas','P0','WF05',['responsavel','gestor','atendente'],'US04'],
  ['APP04','app','/app/conversas/:id','Detalhe de conversa','P0','WF05',['responsavel','gestor','atendente'],'US04'],
  ['APP05','app','/app/clientes','Contatos','P0','WF06',['responsavel','gestor','atendente'],'US06'],
  ['APP06','app','/app/clientes/:id','Detalhe de contato','P0','WF06',['responsavel','gestor','atendente'],'US06'],
  ['APP07','app','/app/vendas','Vendas e funis','P0','WF07',['responsavel','gestor','atendente'],'US07'],
  ['APP08','app','/app/vendas/:id','Oportunidade','P0','WF07',['responsavel','gestor','atendente'],'US07'],
  ['APP09','app','/app/tarefas','Tarefas','P0','WF08',['responsavel','gestor','atendente'],'US08'],
  ['APP10','app','/app/tarefas/:id','Detalhe de tarefa','P0','WF08',['responsavel','gestor','atendente'],'US08'],
  ['APP11','app','/app/automacoes','Automações','P0','WF09',['responsavel','gestor'],'US09'],
  ['APP12','app','/app/automacoes/nova','Criar automação','P0','WF09',['responsavel','gestor'],'US09'],
  ['APP13','app','/app/automacoes/assistente','Assistente de IA','P1','WF10',['responsavel','gestor'],'US10'],
  ['APP14','app','/app/conhecimento','Conhecimento','P1','WF10',['responsavel','gestor'],'US10'],
  ['APP15','app','/app/relatorios','Relatórios','P0','WF11',['responsavel','gestor'],'US11'],
  ['APP16','app','/app/faturamento','Planos e faturamento','P0','WF12',['responsavel','financeiro_cliente'],'US12'],
  ['APP17','app','/app/configuracoes','Configurações','P0','WF13',['responsavel'],'US03'],
  ['APP18','app','/app/configuracoes/organizacao','Organização','P0','WF13',['responsavel'],'US03'],
  ['APP19','app','/app/configuracoes/equipe','Equipe','P0','WF13',['responsavel'],'US03'],
  ['APP20','app','/app/configuracoes/canais','Canal WhatsApp','P0','WF13',['responsavel'],'US03'],
  ['APP21','app','/app/configuracoes/privacidade','Solicitações de privacidade','P0','WF13',['responsavel'],'US14'],
  ['APP22','app','/app/clientes/:id/consentimento','Preferências e consentimento','P0','WF13',['responsavel','gestor','atendente'],'US06'],
  ['APP23','app','/app/faturamento/retorno','Retorno Mercado Pago','P0','WF12',['responsavel','financeiro_cliente'],'US12'],
  ['APP24','app','/app/ajuda','Ajuda','P0','WF14',['responsavel','gestor','atendente','financeiro_cliente'],'US18'],
  ['ADM01','admin','/admin/login','Login interno','P0','WF02',['suporte_interno','financeiro_interno','auditor_interno'],'US15'],
  ['ADM02','admin','/admin','Visão geral técnica','P0','WF15',['suporte_interno'],'US15'],
  ['ADM03','admin','/admin/empresas','Empresas','P0','WF15',['suporte_interno'],'US15'],
  ['ADM04','admin','/admin/empresas/:id','Diagnóstico da empresa','P0','WF15',['suporte_interno'],'US15'],
  ['ADM05','admin','/admin/assinaturas','Assinaturas e reconciliação','P0','WF16',['financeiro_interno'],'US13'],
  ['ADM06','admin','/admin/operacao','Operação e suporte','P0','WF16',['suporte_interno'],'US15'],
  ['ADM07','admin','/admin/auditoria','Auditoria','P0','WF17',['auditor_interno'],'US16'],
  ['ADM08','admin','/admin/auth/callback','Retorno OIDC interno','P0','WF02',['suporte_interno','financeiro_interno','auditor_interno'],'US15'],
];
const associations = {
  'planos_e_pre_os_venda_flow_ai':'PUB02',
  'conversas_app_conversas_venda_flow_ai_desktop_1440px_1':'APP03',
  'vis_o_geral_admin_console_administrativo_venda_flow_ai':'ADM02',
  'criar_conta_venda_flow_ai_cadastro':'PUB04',
  'p_gina_inicial_venda_flow_ai':'PUB01',
  'conversas_app_conversas_venda_flow_ai_desktop_1440px_2':'APP03',
  'relat_rios_app_relatorios_mobile_390px':'APP15',
  'detalhe_da_oportunidade_mobile_390px':'APP08',
  'automa_es_app_automacoes_venda_flow_ai_desktop_1440px':'APP11',
  'configura_es_app_configuracoes_venda_flow_ai_desktop_1440px':'APP17',
  'relat_rios_app_relatorios_venda_flow_ai_desktop_1440px':'APP15',
  'painel_do_cliente_mobile_390px':'APP02',
  'assistente_de_ia_automa_es_mobile_390px':'APP13',
  'suporte_e_auditoria_admin_operacao_console_administrativo_venda_flow_ai':'ADM06',
  'mini_design_system_venda_flow_ai':null,
  'in_cio_app_venda_flow_ai_desktop_1440px':'APP02',
  'automa_es_app_automacoes_mobile_390px':'APP11',
  'clientes_app_clientes_venda_flow_ai_desktop_1440px_1':'APP05',
  'brandboard_venda_flow_ai.png':null,
  'vendas_app_vendas_mobile_390px':'APP07',
  'in_cio_app_mobile_390px':'APP02',
  'login_administrativo_admin_login_venda_flow_ai':'ADM01',
  'p_gina_inicial_mobile_390px':'PUB01',
  'conversas_app_conversas_mobile_390px_1':'APP03',
  'assinaturas_admin_assinaturas_console_administrativo_venda_flow_ai':'ADM05',
  'planos_e_pre_os_mobile_390px':'PUB02',
  'planos_e_faturamento_app_faturamento_mobile_390px':'APP16',
  'criar_automa_o_app_automacoes_nova_venda_flow_ai_desktop_1440px':'APP12',
  'conversas_app_conversas_mobile_390px_2':'APP04',
  'planos_e_faturamento_app_faturamento_venda_flow_ai_desktop_1440px':'APP16',
  'primeiros_passos_mobile_390px_configurar':'APP01',
  'acessar_a_conta_venda_flow_ai_entrar':'PUB03',
  'clientes_app_clientes_venda_flow_ai_desktop_1440px_2':'APP05',
  'assistente_de_ia_automa_es_venda_flow_ai_desktop_1440px':'APP13',
  'primeiros_passos_venda_flow_ai_configurar':'APP01',
  'painel_do_cliente_venda_flow_ai_desktop_1440px':'APP02',
  'configura_es_app_configuracoes_mobile_390px':'APP17',
  'vendas_app_vendas_venda_flow_ai_desktop_1440px':'APP07',
  'empresas_admin_empresas_console_administrativo_venda_flow_ai':'ADM03',
  'venda_flow_ai_design_system':null,
};
const sources = fs.readdirSync(base, {withFileTypes:true}).filter(d=>d.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name)).map(d=>{
  if (!(d.name in associations)) throw new Error(`Export sem classificação: ${d.name}`);
  const files=fs.readdirSync(path.join(base,d.name)).sort().map(name=>{
    const localPath=path.posix.join(base,d.name,name);
    const bytes=fs.readFileSync(localPath);
    return {path:localPath,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
  });
  return {export:d.name,route:associations[d.name],classification:associations[d.name]?'referencia_de_tela':'referencia_de_marca',trustedForProduction:false,files};
});
const routes=rows.map(([id,surface,url,title,priority,wireframe,roles,story])=>({
  id,surface,path:url,title,priority,wireframe,roles,stories:[story],states,
  status:'proposta_nao_implementada',prdMapping:null,
  origin:sources.some(s=>s.route===id)?'export_zip':'complemento_de_jornada_proposto',
  sources:sources.filter(s=>s.route===id).map(s=>s.export),
}));
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(`${out}/routes.json`,JSON.stringify({product:'venda-flow-ai',locale:'pt-BR',currency:'BRL',coverageOfPrd:'indeterminada_prd_ausente',routes},null,2)+'\n');
fs.writeFileSync(`${out}/fontes.json`,JSON.stringify({archiveOriginal:'C:/Users/UBUNTU FUTURE/Documents/Ubuntu Future Labs/VendaFlow/UX-UI/stitch_venda_flow_design_system.zip',sources},null,2)+'\n');
console.log(`Catálogo gerado: ${routes.length} rotas candidatas e ${sources.length} exports classificados.`);
