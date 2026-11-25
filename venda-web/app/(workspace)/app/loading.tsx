import { LoadingBlock } from "../../../components/ui";
export default function Loading() {
  return (
    <main id="conteudo" tabIndex={-1} className="page-container">
      <h1>Seu espaço de trabalho</h1>
      <LoadingBlock />
    </main>
  );
}
