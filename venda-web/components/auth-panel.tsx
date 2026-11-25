import Link from "next/link";
export function AuthPanel({
  mode,
  unavailable = false,
}: {
  mode: "login" | "register" | "reset";
  unavailable?: boolean;
}) {
  const copy =
    mode === "login"
      ? {
          title: "Acesse sua conta",
          description: "Entre com segurança para continuar com sua equipe.",
          action: "Continuar com acesso seguro",
        }
      : mode === "register"
        ? {
            title: "Crie sua conta",
            description:
              "Sua identidade é criada e verificada no provedor de acesso seguro.",
            action: "Continuar no provedor de identidade",
          }
        : {
            title: "Recupere seu acesso",
            description:
              "A recuperação de senha e os fatores de autenticação são gerenciados pelo seu provedor de identidade.",
            action: "Abrir acesso seguro",
          };
  return (
    <section className="auth-card vf-stack">
      <p className="eyebrow">VENDA FLOW AI</p>
      <h1>{copy.title}</h1>
      <p>{copy.description}</p>
      {unavailable && (
        <div className="vf-notice" role="alert">
          <p>
            O serviço de identidade está indisponível. Tente novamente em
            instantes.
          </p>
        </div>
      )}
      <div className="identity-box">
        <p>
          Você será direcionado ao serviço de identidade. A Venda Flow AI não
          solicita sua senha nesta tela.
        </p>
        <a className="vf-button vf-button-primary" href="/v1/auth/login">
          {copy.action}
        </a>
      </div>
      {mode !== "login" && (
        <p className="vf-hint">
          A disponibilidade de cadastro ou recuperação depende da configuração
          do provedor. Nenhuma conta ou alteração é confirmada antes do retorno
          autenticado.
        </p>
      )}
      <nav className="auth-links" aria-label="Alternativas de acesso">
        {mode !== "login" && <Link href="/entrar">Já tenho acesso</Link>}
        {mode !== "register" && <Link href="/cadastro">Criar conta</Link>}
        {mode !== "reset" && (
          <Link href="/recuperar-acesso">Esqueci minha senha</Link>
        )}
      </nav>
    </section>
  );
}
