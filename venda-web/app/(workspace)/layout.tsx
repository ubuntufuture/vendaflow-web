import Link from "next/link";
import { cookies } from "next/headers";
import { Wordmark, Fault } from "../../components/ui";
import { ThemeSwitch } from "../../components/theme.client";
import { me } from "../../lib/api.server";
import { WebFault } from "../../lib/security";
import { logout } from "../actions";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await me();
  } catch (error) {
    const fault = error instanceof WebFault ? error : new WebFault(500);
    return (
      <main id="conteudo" tabIndex={-1} className="page-container">
        <h1>Seu espaço de trabalho</h1>
        <Fault status={fault.status} requestId={fault.requestId} />
      </main>
    );
  }
  const theme =
    (await cookies()).get("vf-theme")?.value === "dark" ? "dark" : "light";
  return (
    <>
      <header className="workspace-header">
        <Link href="/app" aria-label="Venda Flow AI — organizações">
          <Wordmark />
        </Link>
        <nav aria-label="Conta">
          <Link href="/app">Organizações</Link>
          <ThemeSwitch initial={theme} />
          <form action={logout}>
            <button type="submit" className="vf-button vf-button-secondary">
              Sair
            </button>
          </form>
        </nav>
      </header>
      {children}
    </>
  );
}
