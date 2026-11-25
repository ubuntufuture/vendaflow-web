"use client";
export default function ErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <main id="conteudo" className="page-container">
      <h1>Não foi possível carregar esta área</h1>
      <p>
        Atualize o estado antes de continuar. Nenhuma alteração foi confirmada
        nesta tela.
      </p>
      <button
        type="button"
        onClick={reset}
        className="vf-button vf-button-primary"
      >
        Tentar novamente
      </button>
      <a href="/app">Consultar organizações</a>
    </main>
  );
}
