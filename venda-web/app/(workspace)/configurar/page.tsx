import { randomUUID } from "node:crypto";
import { me } from "../../../lib/api.server";
import { OrganizationForm } from "../../../components/organization-form.client";
import { ContentHeading, Panel } from "../../../components/ui";
export const metadata = { title: "Primeiros passos" };
export default async function Onboarding() {
  await me();
  return (
    <main id="conteudo" tabIndex={-1} className="page-container st-onboarding">
      <ContentHeading
        eyebrow="PRIMEIROS PASSOS"
        title="Vamos organizar seu espaço"
      >
        Comece pelas informações da sua organização.
      </ContentHeading>
      <ol className="st-progress" aria-label="Configuração guiada"><li aria-current="step"><span>1</span>Sua empresa</li><li><span>2</span>Canal WhatsApp</li><li><span>3</span>Pronto para começar</li></ol>
      <Panel title="Identificação da organização">
        <OrganizationForm intentKey={randomUUID()} />
      </Panel>
      <p className="availability-note">
        Canal WhatsApp, equipe e assinatura são etapas independentes. A
        configuração será apresentada conforme a disponibilidade dos serviços e
        as permissões da sua conta.
      </p>
    </main>
  );
}
