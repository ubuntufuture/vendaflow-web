import { notFound } from "next/navigation";
import { ContentHeading, Panel } from "../../../components/ui";
export default async function Legal({
  params,
}: {
  params: Promise<{ legal: string }>;
}) {
  const { legal } = await params;
  if (!["privacidade", "termos"].includes(legal)) notFound();
  return (
    <div className="page-container">
      <ContentHeading
        eyebrow="INFORMAÇÕES LEGAIS"
        title={legal === "privacidade" ? "Privacidade" : "Termos de uso"}
      />
      <Panel title="Documento oficial pendente de publicação">
        <p>
          O texto jurídico aprovado e os canais oficiais do responsável pelo
          tratamento ainda não foram fornecidos para este ambiente.
        </p>
        <p>
          Não coletamos aceite de um documento ausente. Este ambiente não deve
          receber dados pessoais de clientes antes da publicação e validação dos
          documentos aplicáveis.
        </p>
        {legal === "privacidade" && (
          <p>
            Cadastro de contato não representa consentimento geral de marketing.
            Finalidade, canal e base legal precisam ser verificados antes de
            qualquer comunicação.
          </p>
        )}
      </Panel>
    </div>
  );
}
