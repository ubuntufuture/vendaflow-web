import { Fault } from "../components/ui";
export default function NotFound() {
  return (
    <main id="conteudo" className="page-container">
      <h1>Página não encontrada</h1>
      <Fault status={404} />
    </main>
  );
}
