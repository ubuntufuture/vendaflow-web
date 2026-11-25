import { organizations } from "../../../lib/api.server";
import { WebFault } from "../../../lib/security";
import {
  ActionLink,
  ContentHeading,
  Fault,
  Panel,
} from "../../../components/ui";
export const metadata = { title: "Organizações" };
export default async function Organizations() {
  let items;
  try {
    items = await organizations();
  } catch (error) {
    const fault = error instanceof WebFault ? error : new WebFault(500);
    return (
      <main id="conteudo" className="page-container">
        <h1>Organizações</h1>
        <Fault status={fault.status} />
      </main>
    );
  }
  return (
    <main id="conteudo" tabIndex={-1} className="page-container">
      <ContentHeading
        eyebrow="SEU ESPAÇO DE TRABALHO"
        title="Escolha sua organização"
      >
        Você vê somente as organizações disponíveis para sua sessão.
      </ContentHeading>
      {items.length ? (
        <div className="organization-grid">
          {items.map((org) => (
            <Panel key={org.id} title={org.name}>
              <p>{org.timezone}</p>
              <p className="vf-hint">pt-BR · BRL</p>
              <ActionLink href={`/app/o/${org.id}`}>
                Abrir organização
              </ActionLink>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel title="Sua primeira organização">
          <p>
            Você ainda não tem uma organização disponível. Crie uma para começar
            ou solicite acesso ao responsável pela sua equipe.
          </p>
          <ActionLink href="/configurar">Configurar organização</ActionLink>
        </Panel>
      )}
      <div className="section-spacer">
        <ActionLink href="/configurar" secondary>
          Criar outra organização
        </ActionLink>
      </div>
    </main>
  );
}
