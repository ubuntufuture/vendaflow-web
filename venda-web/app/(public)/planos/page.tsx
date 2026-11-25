import { ContentHeading, Panel, ActionLink } from "../../../components/ui";
export const metadata = { title: "Planos" };
export default function Plans() {
  return (
    <div className="page-container">
      <ContentHeading eyebrow="ASSINATURA" title="Planos e contratação">
        Consulte condições verificadas antes de contratar.
      </ContentHeading>
      <div className="st-three" style={{marginBottom:32}}>
        {["Estruture seu atendimento", "Organize sua operação", "Amplie com governança"].map((title) => <article className="st-card st-template" key={title}><span className="st-chip">Condições não publicadas</span><h2>{title}</h2><p>Plano, preço, limites e disponibilidade aguardam confirmação do catálogo de assinaturas.</p><strong>Valor não disponível</strong><ActionLink href="/entrar" secondary>Consultar minha conta</ActionLink></article>)}
      </div>
      <Panel title="Condições ainda indisponíveis">
        <p>
          Não há catálogo de planos e preços confirmado pelo serviço de
          assinatura neste ambiente.
        </p>
        <p>
          Quando disponível, a contratação será feita exclusivamente pelo
          Mercado Pago. Criar uma conta não confirma assinatura, trial ou
          gratuidade.
        </p>
        <ActionLink href="/entrar">Acessar minha conta</ActionLink>
      </Panel>
      <section className="st-section" style={{paddingTop:48}}><h2>Perguntas frequentes sobre faturamento</h2><div className="st-faq"><details><summary>Como funciona o pagamento?</summary><p>O gateway exclusivo será o Mercado Pago. Nenhum checkout está ativo neste ambiente.</p></details><details><summary>Há fidelidade ou taxa de cancelamento?</summary><p>As condições contratuais ainda não foram fornecidas. Nenhuma isenção ou gratuidade é presumida.</p></details><details><summary>Como funcionam os custos de envio do WhatsApp?</summary><p>Custos e limites do canal devem ser verificados na integração oficial. Eles não são apresentados como parte confirmada da assinatura.</p></details></div></section>
    </div>
  );
}
