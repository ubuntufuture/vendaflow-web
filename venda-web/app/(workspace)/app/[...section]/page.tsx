import { notFound } from "next/navigation";
import { organizations } from "../../../../lib/api.server";
import { moduleTitle } from "../../../../lib/modules";
import { Panel, ActionLink, ContentHeading } from "../../../../components/ui";
export default async function SelectOrganization({
  params,
}: {
  params: Promise<{ section: string[] }>;
}) {
  const { section } = await params;
  const slug = section.join("/");
  const title = moduleTitle(slug);
  if (!title) notFound();
  const items = await organizations();
  return (
    <main id="conteudo" className="page-container">
      <ContentHeading eyebrow="CONTEXTO DE TRABALHO" title={title}>
        Escolha uma organização para continuar.
      </ContentHeading>
      <div className="organization-grid">
        {items.map((org) => (
          <Panel key={org.id} title={org.name}>
            <ActionLink href={`/app/o/${org.id}/${slug}`}>
              Abrir nesta organização
            </ActionLink>
          </Panel>
        ))}
      </div>
      {!items.length && (
        <Panel title="Nenhuma organização disponível">
          <ActionLink href="/configurar">Configurar organização</ActionLink>
        </Panel>
      )}
    </main>
  );
}
