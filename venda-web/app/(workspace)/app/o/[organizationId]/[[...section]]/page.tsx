import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import {
  me,
  organization,
  memberships,
} from "../../../../../../lib/api.server";
import { uuid } from "../../../../../../lib/validation";
import {
  modules,
  visibleModules,
  moduleTitle,
} from "../../../../../../lib/modules";
import { WebFault } from "../../../../../../lib/security";
import {
  ContentHeading,
  Fault,
  Panel,
  Unavailable,
  ActionLink,
} from "../../../../../../components/ui";
import { ResponsiveMenu } from "../../../../../../components/responsive-menu.client";
import { OrganizationForm } from "../../../../../../components/organization-form.client";
import { StitchScreen, SettingsTabs } from "../../../../../../components/stitch-screens.client";
import { BrandIcon } from "../../../../../../components/brand-icon";
import { CommerceRoute } from "../../../../../../components/commerce-route";
import { AutomationWizard } from "../../../../../../components/automation-wizard.client";
export default async function OrganizationPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string; section?: string[] }>;
  searchParams: Promise<{q?:string;cursor?:string}>;
}) {
  const { organizationId: id, section = [] } = await params;
  const search=await searchParams;
  if (!uuid.safeParse(id).success) notFound();
  const slug = section.join("/");
  const title = moduleTitle(slug);
  if (!title) notFound();
  let org, team, current;
  try {
    current = await me();
    [org, team] = await Promise.all([organization(id), memberships(id)]);
  } catch (error) {
    const fault = error instanceof WebFault ? error : new WebFault(500);
    return (
      <main id="conteudo" className="page-container">
        <h1>{title}</h1>
        <Fault status={fault.status} requestId={fault.requestId} />
      </main>
    );
  }
  const role = team.find((m) => m.userId === current.user.id && m.active)?.role;
  if (!role)
    return (
      <main id="conteudo" className="page-container">
        <h1>{title}</h1>
        <Fault status={403} />
      </main>
    );
  const base = `/app/o/${id}`;
  const allowed = visibleModules(role);
  const settingsEntry = allowed.find((m) => m.slug.startsWith("configuracoes/"));
  const navigation = allowed.filter((m) => !m.slug.startsWith("configuracoes/") || m === settingsEntry);
  const hidden =
    modules.some((m) => m.slug === slug) &&
    !allowed.some((m) => m.slug === slug);
  return (
    <div className="workspace-grid">
      <aside className="workspace-sidebar">
        <div className="organization-label">
          <span className="eyebrow">ORGANIZAÇÃO</span>
          <strong>{org.name}</strong>
          <span className="vf-hint">{org.timezone}</span>
        </div>
        <ResponsiveMenu>
          <nav aria-label="Organização">
            {navigation.map((m) => (
              <Link
                key={m.slug}
                href={`${base}${m.slug ? `/${m.slug}` : ""}`}
                prefetch={false}
                aria-current={m.slug === slug || m === settingsEntry && slug.startsWith("configuracoes") ? "page" : undefined}
              >
                <BrandIcon name={m.slug === "" ? "home" : m.slug === "conversas" ? "conversation" : m.slug === "clientes" ? "contacts" : m.slug === "vendas" || m.slug === "relatorios" ? "sales" : m.slug === "automacoes" ? "automation" : m.slug === "tarefas" ? "task" : m.slug === "faturamento" ? "billing" : "settings"}/>
                {m.slug === "" ? "Início" : m === settingsEntry ? "Configurações" : m.title}
              </Link>
            ))}
          </nav>
        </ResponsiveMenu>
        <p className="sidebar-note">
          Consulte o acesso da equipe e a disponibilidade do canal nas
          configurações.
        </p>
      </aside>
      <main id="conteudo" tabIndex={-1} className="workspace-main">
        <ContentHeading eyebrow={org.name} title={slug === "" ? "Início" : title} />
        {slug.startsWith("configuracoes") && <SettingsTabs base={base} slug={slug}/>}
        {hidden ? (
          <Fault status={403} />
        ) : slug==='automacoes/nova' ? (
          ["owner","admin","manager","agent"].includes(role)?<AutomationWizard organizationId={id} intentKey={randomUUID()}/>:<Fault status={403}/>
        ) : role!=="billing" && ["", "clientes", "vendas", "tarefas", "conhecimento", "automacoes", "relatorios"].includes(slug) ? (
          <CommerceRoute slug={slug} organizationId={id} canMutate={["owner","admin","manager","agent"].includes(role)} canManageAutomation={["owner","admin","manager"].includes(role)} timezone={org.timezone} {...(typeof search.q==='string'?{query:search.q}:{})} {...(typeof search.cursor==='string'?{cursor:search.cursor}:{})}/>
        ) : !["configuracoes/organizacao", "configuracoes/equipe", "ajuda"].includes(slug) ? (
          <StitchScreen key={slug} slug={slug} base={base} organizationName={org.name} canMutate={["owner","admin","manager","agent"].includes(role)}/>
        ) : slug === "configuracoes/organizacao" ? (
          <Panel title="Dados da organização">
            {role === "owner" || role === "admin" ? (
              <OrganizationForm
                id={id}
                intentKey={randomUUID()}
                name={org.name}
                timezone={org.timezone}
              />
            ) : (
              <Fault status={403} />
            )}
          </Panel>
        ) : slug === "configuracoes/equipe" ? (
          <Panel title="Acessos confirmados">
            <p className="vf-hint">
              Nomes e e-mails ainda não estão disponíveis. Os acessos abaixo
              foram confirmados para esta organização. Convites por e-mail ainda
              não estão disponíveis.
            </p>
            <div
              className="vf-table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Acessos da organização"
            >
              <table className="vf-table">
                <caption>Acessos da organização</caption>
                <thead>
                  <tr>
                    <th scope="col">Pessoa</th>
                    <th scope="col">Perfil</th>
                    <th scope="col">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((m) => (
                    <tr key={m.id}>
                      <td>
                        {m.userId === current.user.id ? "Você" : m.userId}
                      </td>
                      <td>
                        {
                          {
                            owner: "Responsável",
                            admin: "Administrador",
                            manager: "Gestor",
                            agent: "Atendente",
                            viewer: "Leitor",
                            billing: "Financeiro",
                          }[m.role]
                        }
                      </td>
                      <td>{m.active ? "Ativo" : "Inativo"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : slug === "ajuda" ? (
          <Panel title="Continue com segurança">
            <p>
              Em caso de falha, consulte o estado atual antes de repetir uma
              alteração. Uma falha pode apresentar uma referência para
              diagnóstico.
            </p>
            <p>
              O suporte oficial e seus canais de contato ainda não foram
              fornecidos neste ambiente.
            </p>
            <ActionLink href="/app" secondary>
              Trocar organização
            </ActionLink>
          </Panel>
        ) : (
          <Unavailable
            title={
              slug.startsWith("faturamento")
                ? "Assinatura ainda não confirmada"
                : `${title}: serviço ainda indisponível`
            }
          >
            {slug.startsWith("faturamento")
              ? "Não foi possível confirmar a situação da assinatura. A contratação pelo Mercado Pago ainda não está disponível neste ambiente. Um retorno de pagamento não libera acesso sem confirmação."
              : slug === "configuracoes/canais"
                ? "A conexão oficial do WhatsApp ainda não está disponível neste ambiente. Quando habilitada, a conexão será realizada pelo fluxo oficial. Nenhum canal ou envio foi confirmado."
                : slug === "configuracoes/privacidade"
                  ? "Ainda não há serviço contratado para solicitações de privacidade. Nenhuma preferência ou consentimento é presumido. Não cadastre dados pessoais neste ambiente antes da validação dos documentos e fluxos aplicáveis."
                  : "Este recurso ainda não está disponível neste ambiente. Seus registros e indicadores não puderam ser consultados."}
          </Unavailable>
        )}
      </main>
    </div>
  );
}
