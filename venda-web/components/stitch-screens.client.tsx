"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { BrandIcon } from "./brand-icon";
import type { IconName } from "../../packages/ui/components/icons";

const pending = "O serviço ainda não está disponível neste ambiente. Nenhum registro, envio ou pagamento foi confirmado.";
export function ScreenCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <section className="st-card"><header className="st-card-head"><h2>{title}</h2>{action}</header>{children}</section>;
}
export function ScreenEmpty({ title, text = pending, icon = "folder" }: {title: string; text?: string; icon?: IconName | "integration"}) {
  return <div className="st-empty"><BrandIcon name={icon}/><h3>{title}</h3><p>{text}</p></div>;
}
export function Metrics({labels = ["Conversas", "Contatos", "Oportunidades", "Receita confirmada"]}: {labels?: string[]}) {
  const icons: IconName[] = ["conversation", "contacts", "sales", "billing"];
  return <div className="st-metrics">{labels.map((label, i) => <div className="st-metric" key={label}><BrandIcon name={icons[i % icons.length]!}/><span>{label}</span><strong aria-label="Valor não disponível">—</strong><small>Dados não disponíveis</small></div>)}</div>;
}
function Button({children, onClick, secondary = false}: {children: ReactNode; onClick?: () => void; secondary?: boolean}) {
  return <button type="button" className={`vf-button vf-button-${secondary ? "secondary" : "primary"}`} onClick={onClick}>{children}</button>;
}
function TableEmpty({columns, title, text}: {columns: string[]; title: string; text?: string}) {
  return <div className="st-table-scroll" role="region" aria-label={title} tabIndex={0}><table className="st-table"><caption className="vf-sr-only">{title}</caption><thead><tr>{columns.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead><tbody><tr><td colSpan={columns.length}><ScreenEmpty title={title} {...(text ? {text} : {})}/></td></tr></tbody></table></div>;
}
function AssistantSettings({onUnavailable}: {onUnavailable: () => void}) {
  const [intro, setIntro] = useState("");
  const [hours, setHours] = useState("");
  const [handoff, setHandoff] = useState("Revisão humana antes de enviar");
  const [question, setQuestion] = useState("");
  return <div className="st-columns"><ScreenCard title="Ativar assistente"><div className="st-card-content st-detail"><div className="st-switch-line"><strong>Assistente de atendimento</strong><span className="st-chip">Não habilitado</span></div><p>Defina o contexto e os limites da IA. Este formulário mantém apenas um rascunho temporário.</p><label className="st-field">Apresentação da empresa<textarea value={intro} onChange={e => setIntro(e.target.value)} placeholder="O que a equipe precisa saber sobre sua empresa?"/></label><label className="st-field">Horário de atendimento<input value={hours} onChange={e => setHours(e.target.value)} placeholder="Informe o horário no fuso da organização"/></label><label className="st-field">Encaminhamento para a equipe<select value={handoff} onChange={e => setHandoff(e.target.value)}><option>Revisão humana antes de enviar</option><option>Solicitação do contato</option><option>Resposta não encontrada</option></select></label><h3>Perguntas e respostas frequentes</h3><p>Nenhuma fonte carregada. A API de conhecimento ainda não está disponível.</p><Button onClick={onUnavailable}>Salvar e validar configuração</Button></div></ScreenCard><ScreenCard title="Testar resposta"><div className="st-card-content st-detail"><p>Confira sugestões antes de habilitar o atendimento.</p><label className="st-field">Pergunta para teste<textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="Digite uma pergunta sem dados pessoais…"/></label><Button onClick={onUnavailable}>Testar resposta</Button><ScreenEmpty title="Nenhuma resposta gerada" text="O serviço de IA não está conectado. Nenhuma confiança, fonte ou resposta foi simulada." icon="automation"/></div></ScreenCard></div>;
}
export function SettingsTabs({base, slug}: {base: string; slug: string}) {
  return <nav className="st-tabs st-settings-tabs" aria-label="Configurações">{[["canais","WhatsApp"],["organizacao","Empresa"],["equipe","Equipe"],["privacidade","Privacidade"]].map(([path,label]) => <Link key={path} href={`${base}/configuracoes/${path}`} aria-current={slug.endsWith(path!) ? "page" : undefined}>{label}</Link>)}</nav>;
}
export function StitchScreen({slug, base, organizationName, canMutate}: {slug: string; base: string; organizationName: string; canMutate: boolean}) {
  const [filter, setFilter] = useState("Todas");
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("30 dias");
  const [drawer, setDrawer] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [step, setStep] = useState(1);
  const [trigger, setTrigger] = useState("Nova conversa recebida");
  const [action, setAction] = useState("Criar tarefa para a equipe");
  const [message, setMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const open = (title: string) => { setNotice(""); setDrawer(title); dialog.current?.showModal(); };
  const close = () => { dialog.current?.close(); setDrawer(null); setNotice(""); };
  const blocked = () => setNotice(canMutate ? pending : "Seu perfil tem acesso somente à consulta. Esta ação requer permissão de alteração.");
  const search = (placeholder: string) => <input className="st-search" type="search" aria-label={placeholder} placeholder={placeholder} value={query} onChange={e => setQuery(e.target.value)}/>;
  const filters = (items: string[]) => <div className="st-tools" aria-label="Filtros">{items.map(item => <button type="button" key={item} className={`vf-button vf-button-${filter === item ? "primary" : "secondary"}`} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div>;
  const noResults = query ? `Nenhum resultado confirmado para “${query}”. A consulta ao serviço está indisponível.` : pending;
  const automationTabs = <nav className="st-tabs" aria-label="Automações"><Link href={`${base}/automacoes`} aria-current={slug === "automacoes" ? "page" : undefined}>Automações</Link><Link href={`${base}/automacoes/assistente`} aria-current={slug === "automacoes/assistente" ? "page" : undefined}>Assistente de IA</Link></nav>;
  let content: ReactNode;

  if (slug === "") content = <>
    <div className="st-page-head"><div><h2>Seu atendimento, em um só lugar.</h2><p>Acompanhe as conversas e os próximos passos de {organizationName}.</p></div><span className="st-chip"><BrandIcon name="clock"/>Visão geral</span></div>
    <Metrics/>
    <div className="st-columns"><ScreenCard title="Conversas que precisam de atenção" action={<Link href={`${base}/conversas`}>Ver conversas</Link>}><ScreenEmpty title="Fila de atendimento indisponível" icon="conversation"/></ScreenCard><ScreenCard title="Próximos passos"><div className="st-card-content st-detail"><p>Prepare seu espaço de trabalho.</p><div className="st-switch-line"><span>Organização</span><span className="st-chip">Confirmada</span></div><Link className="st-switch-line" href={`${base}/configuracoes/equipe`}>Consultar acessos <BrandIcon name="chevron"/></Link><Link className="st-switch-line" href={`${base}/configuracoes/canais`}>Conectar WhatsApp <BrandIcon name="chevron"/></Link><Link className="st-switch-line" href={`${base}/faturamento`}>Consultar assinatura <BrandIcon name="chevron"/></Link></div></ScreenCard></div>
    <div className="st-columns"><ScreenCard title="Evolução das vendas"><div className="st-chart-empty"><p>O histórico não pôde ser consultado. Nenhum gráfico foi estimado.</p></div></ScreenCard><ScreenCard title="Tarefas e acompanhamentos"><ScreenEmpty title="Tarefas ainda não disponíveis" icon="task"/></ScreenCard></div>
  </>;
  else if (slug === "conversas") content = <div className="st-chat">
    <section className="st-chat-list" aria-label="Lista de conversas"><div className="st-page-head"><h2>Conversas</h2><Button secondary onClick={() => open("Nova conversa")}><BrandIcon name="plus"/><span className="vf-sr-only">Nova conversa</span></Button></div>{search("Buscar conversa")}{filters(["Todas","Minhas","Não atribuídas"])}<ScreenEmpty title="Conversas indisponíveis" text={noResults} icon="conversation"/></section>
    <section className="st-chat-thread" aria-label="Atendimento"><header className="st-card-head"><h2>Nenhuma conversa selecionada</h2><Button secondary onClick={() => open("Dados do contato")}>Detalhes</Button></header><div className="st-notice">Envios dependem da conexão oficial, da janela de atendimento e das permissões por finalidade e canal.</div><ScreenEmpty title="Selecione uma conversa" text="O histórico aparecerá aqui quando o serviço estiver disponível e uma conversa for selecionada." icon="conversation"/><div className="st-composer"><label className="vf-sr-only" htmlFor="message-draft">Rascunho de mensagem</label><textarea id="message-draft" placeholder="Escreva um rascunho…" value={message} onChange={e => setMessage(e.target.value)}/><div className="st-tools"><small>Rascunho temporário. Nenhum destinatário selecionado.</small><Button onClick={blocked}>Enviar mensagem</Button></div></div></section>
    <aside className="st-chat-contact" aria-label="Contexto do contato"><header className="st-card-head"><h2>Dados do contato</h2></header><ScreenEmpty title="Nenhum contato selecionado" text="Informações, oportunidades e notas serão exibidas com o contexto da conversa." icon="contacts"/><div className="st-card-content st-detail"><h3>Oportunidades</h3><p>Selecione um contato para consultar o histórico comercial.</p><h3>Notas internas</h3><p>Nenhuma nota carregada.</p></div></aside>
  </div>;
  else if (slug === "clientes") content = <>
    <div className="st-page-head"><div><h2>Todos os contatos</h2><p>Relacionamento, contexto e próximos passos da sua equipe.</p></div><Button onClick={() => open("Adicionar contato")}><BrandIcon name="plus"/>Adicionar contato</Button></div>
    <div className="st-tools">{search("Buscar por nome, telefone ou e-mail")}<Button secondary onClick={() => open("Filtros de contatos")}>Filtros</Button><Button secondary onClick={() => open("Importar contatos")}>Importar contatos</Button></div>
    <ScreenCard title="Base de contatos" action={<span className="st-chip">Consulta indisponível</span>}><TableEmpty columns={["Contato","Telefone / e-mail","Última interação","Responsável","Situação"]} title="Contatos ainda não disponíveis" text={noResults}/></ScreenCard>
    <p className="vf-hint">A base não foi consultada. Ausência de resultados não significa ausência de contatos.</p>
  </>;
  else if (slug === "vendas") content = <>
    <div className="st-page-head"><div><h2>Funil de vendas</h2><p>Cada oportunidade com um próximo passo claro.</p></div><Button onClick={() => open("Nova oportunidade")}><BrandIcon name="plus"/>Nova oportunidade</Button></div>
    <div className="st-tools">{search("Buscar oportunidade")}<Button secondary onClick={() => open("Filtros de vendas")}>Filtros</Button><Button secondary onClick={() => open("Configurar funil")}>Configurar funil</Button></div>
    <Metrics labels={["Oportunidades abertas","Valor em propostas","Vendas confirmadas","Receita confirmada"]}/>
    <div className="st-board" role="region" aria-label="Kanban de oportunidades" tabIndex={0}>{["Novo","Em conversa","Proposta enviada","Fechado"].map(stage => <section className="st-lane" key={stage}><h3>{stage}<span>—</span></h3><p>Oportunidades não carregadas.<br/>Nenhum total calculado.</p><Button secondary onClick={() => open(`Nova oportunidade — ${stage}`)}><BrandIcon name="plus"/>Adicionar</Button></section>)}</div>
    <p className="vf-hint">Proposta não representa receita. As etapas são a referência visual do export e precisam ser confirmadas pelo serviço do funil.</p>
  </>;
  else if (slug === "tarefas") content = <><div className="st-page-head"><div><h2>Seu próximo passo faz a diferença.</h2><p>Organize acompanhamentos e mantenha o contexto das conversas.</p></div><Button onClick={() => open("Nova tarefa")}><BrandIcon name="plus"/>Nova tarefa</Button></div>{filters(["Todas","Minhas","Pendentes","Concluídas"])}<ScreenCard title="Acompanhamentos"><TableEmpty columns={["Tarefa","Contato","Responsável","Prazo","Situação"]} title="Tarefas ainda não disponíveis"/></ScreenCard></>;
  else if (slug === "automacoes") content = <>
    <div className="st-page-head"><div><h2>Automatize o básico. Cuide melhor de cada cliente.</h2><p>Organize ações com regras claras e acompanhamento da equipe.</p></div><Link className="vf-button vf-button-primary" href={`${base}/automacoes/nova`}><BrandIcon name="plus"/>Criar automação</Link></div>{automationTabs}
    <h3>Comece com um modelo</h3><div className="st-three">{[["Boas-vindas","Prepare uma recepção para novas conversas.","conversation"],["Acompanhamento","Organize tarefas para dar continuidade.","task"],["Organização de contatos","Defina regras para manter o contexto.","contacts"]].map(([title,text,icon]) => <article className="st-card st-template" key={title}><BrandIcon name={icon as IconName}/><h3>{title}</h3><p>{text}</p><Link href={`${base}/automacoes/nova`} className="vf-button vf-button-secondary">Usar modelo</Link></article>)}</div>
    <ScreenCard title="Suas automações"><TableEmpty columns={["Automação","Gatilho","Última execução","Situação","Ações"]} title="Automações ainda não disponíveis"/></ScreenCard>
  </>;
  else if (slug === "automacoes/nova") content = <div className="st-wizard">
    <Link href={`${base}/automacoes`}>← Voltar para automações</Link><ol className="st-progress">{["Quando acontece","O que fazer","Revisar e ativar"].map((label,i) => <li key={label} aria-current={step === i+1 ? "step" : undefined}><span>{i+1}</span>{label}</li>)}</ol>
    <ScreenCard title={step === 1 ? "Quando sua automação deve começar?" : step === 2 ? "O que você quer que aconteça?" : "Revise antes de ativar"}><div className="st-card-content">
      {step === 1 && <><p>Escolha o evento que inicia este rascunho.</p>{["Nova conversa recebida","Oportunidade muda de etapa","Tarefa vence"].map(value => <label className="st-radio" key={value}><input type="radio" name="trigger" value={value} checked={trigger === value} onChange={() => setTrigger(value)}/>{value}</label>)}</>}
      {step === 2 && <>{["Criar tarefa para a equipe","Sugerir resposta para revisão","Atribuir responsável"].map(value => <label className="st-radio" key={value}><input type="radio" name="action" value={value} checked={action === value} onChange={() => setAction(value)}/>{value}</label>)}<label className="st-field">Instruções da ação<textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Descreva a ação desejada…"/></label><div className="st-notice">Mensagens e automações precisam respeitar autorização, finalidade, canal e disponibilidade do WhatsApp.</div></>}
      {step === 3 && <div className="st-detail"><h3>{trigger}</h3><p>{action}</p><p>{message || "Nenhuma instrução adicional."}</p><div className="st-notice">Rascunho temporário nesta tela. A ativação depende da API, da permissão e da validação das regras. Nenhuma automação foi criada.</div></div>}
      <div className="st-tools"><Button secondary onClick={() => step > 1 ? setStep(step-1) : window.history.back()}>Voltar</Button><Button onClick={() => {setNotice(""); if(step < 3) setStep(step+1); else blocked();}}>{step < 3 ? "Continuar" : "Validar e ativar"}</Button></div>
    </div></ScreenCard>
  </div>;
  else if (slug === "automacoes/assistente") content = <>{automationTabs}<div className="st-page-head"><div><h2>Automatize o básico. Cuide melhor de cada cliente.</h2><p>Revise o conhecimento e as regras antes de habilitar sugestões.</p></div></div><AssistantSettings onUnavailable={blocked}/></>;
  else if (slug === "conhecimento") content = <><div className="st-page-head"><div><h2>Conhecimento da sua empresa</h2><p>Fontes revisadas para apoiar a equipe e o assistente.</p></div><Button onClick={() => open("Adicionar conhecimento")}>Adicionar fonte</Button></div><ScreenCard title="Base de conhecimento"><TableEmpty columns={["Fonte","Última atualização","Situação","Ações"]} title="Conhecimento ainda não disponível"/></ScreenCard></>;
  else if (slug === "relatorios") content = <>
    <div className="st-page-head"><div><h2>Clareza para o próximo passo.</h2><p>Atendimento, oportunidades e receita com definições distintas.</p></div><div className="st-tools" aria-label="Período">{["7 dias","30 dias","90 dias"].map(value => <button key={value} type="button" className={`vf-button vf-button-${period === value ? "primary" : "secondary"}`} aria-pressed={period === value} onClick={() => setPeriod(value)}>{value}</button>)}</div></div>
    <Metrics labels={["Conversas no período","Oportunidades","Propostas enviadas","Receita confirmada"]}/><ScreenCard title={`Evolução no período — ${period}`}><div className="st-chart-empty"><p>Série temporal indisponível. Nenhum gráfico ou tendência foi inventado.</p></div></ScreenCard><ScreenCard title="Detalhamento por período"><TableEmpty columns={["Período","Conversas","Propostas","Vendas confirmadas","Receita confirmada"]} title="Relatório ainda não disponível"/></ScreenCard><div className="st-notice">Valores em propostas são intenção comercial. Receita exige confirmação da origem financeira; assinatura da plataforma não representa venda do seu negócio. Fuso horário da organização aplicado pelo serviço quando disponível.</div>
  </>;
  else if (slug.startsWith("faturamento")) content = <>
    <div className="st-page-head"><div><h2>Seu plano, com transparência.</h2><p>Assinatura, limites de uso e histórico em um só lugar.</p></div><span className="st-chip">Mercado Pago</span></div><div className="st-columns"><ScreenCard title="Assinatura da organização"><div className="st-card-content st-detail"><span className="st-chip">Assinatura ainda não confirmada</span><h3>Plano e valor não disponíveis</h3><p>Não foi possível confirmar a situação da assinatura. Nenhuma contratação ou renovação foi confirmada.</p><div className="st-tools"><Button onClick={() => open("Gerenciar assinatura")}>Gerenciar assinatura</Button><Button secondary onClick={() => open("Alterar plano")}>Alterar plano</Button></div></div></ScreenCard><ScreenCard title="Pagamento seguro"><div className="st-card-content st-detail"><BrandIcon name="shield"/><h3>Exclusivamente Mercado Pago</h3><p>A contratação ainda não está disponível neste ambiente. O retorno do navegador não libera acesso sem confirmação server-side.</p><p>Falhas ou pendências de reconciliação precisam preservar o estado confirmado.</p></div></ScreenCard></div>
    <Metrics labels={["Uso de conversas","Contatos","Equipe","Limites do plano"]}/><ScreenCard title="Contratação e reconciliação"><div className="st-card-content"><ol className="st-progress">{["Escolher plano","Mercado Pago","Confirmar pagamento","Reconciliar","Liberar acesso"].map((s,i) => <li key={s}><span>{i+1}</span>{s}</li>)}</ol><div className="st-notice">Não há checkout ativo. Não forneça dados de cartão nesta plataforma.</div></div></ScreenCard><ScreenCard title="Histórico de cobranças"><TableEmpty columns={["Data","Referência","Valor","Situação","Comprovante"]} title="Cobranças ainda não disponíveis"/></ScreenCard>
  </>;
  else if (slug === "configuracoes" || slug === "configuracoes/canais") content = <>
    <div className="st-columns"><ScreenCard title="WhatsApp Business Platform" action={<span className="st-chip">Não confirmado</span>}><div className="st-card-content st-detail"><BrandIcon name="conversation"/><h3>Conecte seu canal oficial</h3><p>Nenhum número ou conexão foi confirmado. A integração será feita pelo fluxo oficial quando estiver disponível.</p><Metrics labels={["Número conectado","Qualidade","Disponibilidade"]}/><div className="st-tools"><Button onClick={() => open("Conectar WhatsApp")}>Conectar WhatsApp</Button><Button secondary onClick={blocked}>Verificar conexão</Button></div></div></ScreenCard><ScreenCard title="Templates e limites"><ScreenEmpty title="Limites não consultados" text="Disponibilidade, qualidade e aprovação de templates são informadas pelo provedor, sem valores presumidos." icon="integration"/></ScreenCard></div><ScreenCard title="Configurações avançadas"><div className="st-card-content st-detail"><details><summary>Webhooks e eventos</summary><p>URLs e credenciais de produção não foram fornecidas. Nenhum webhook está confirmado.</p></details><details><summary>Auditoria do canal</summary><p>O histórico do canal ainda não pode ser consultado.</p></details></div></ScreenCard>
  </>;
  else if (slug === "configuracoes/privacidade") content = <div className="st-columns"><ScreenCard title="Finalidades e canais"><ScreenEmpty title="Preferências ainda não disponíveis" text="Nenhuma base legal ou consentimento é presumido. As regras precisam ser verificadas por finalidade e canal antes da comunicação." icon="shield"/></ScreenCard><ScreenCard title="Solicitações de privacidade"><div className="st-card-content st-detail"><p>O serviço de solicitações ainda não está disponível neste ambiente.</p><Button secondary onClick={() => open("Solicitação de privacidade")}>Consultar requisitos</Button></div></ScreenCard></div>;
  else content = <ScreenCard title="Disponibilidade do recurso"><ScreenEmpty title="Serviço ainda não disponível"/></ScreenCard>;

  return <div className="st-page">{content}{notice && <div role="alert" className="st-notice">{notice}</div>}
    <dialog ref={dialog} className="st-dialog" onCancel={() => setDrawer(null)} onClick={e => {if(e.target === e.currentTarget) close();}} aria-labelledby="st-drawer-title"><div className="st-drawer"><header><h2 id="st-drawer-title">{drawer}</h2><Button secondary onClick={close}><BrandIcon name="close"/><span className="vf-sr-only">Fechar painel</span></Button></header><div className="st-notice">{canMutate ? pending : "Seu perfil tem acesso somente à consulta."}</div><p>Esta ação depende do serviço e das regras de autorização correspondentes. Nenhum dado foi alterado.</p>{drawer === "Dados do contato" ? <ScreenEmpty title="Selecione uma conversa" text="O painel será preenchido com os dados confirmados do contato." icon="contacts"/> : <p className="vf-hint">A tela preserva o contexto atual. Feche este painel para continuar navegando.</p>}<Button secondary onClick={close}>Voltar à tela</Button></div></dialog>
  </div>;
}
