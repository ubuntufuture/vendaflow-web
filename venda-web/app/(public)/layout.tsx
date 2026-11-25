import Link from "next/link";
import { cookies } from "next/headers";
import { Wordmark, ActionLink } from "../../components/ui";
import { ThemeSwitch } from "../../components/theme.client";
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme =
    (await cookies()).get("vf-theme")?.value === "dark" ? "dark" : "light";
  return (
    <>
      <header className="public-header">
        <Link href="/" aria-label="Venda Flow AI — início">
          <Wordmark />
        </Link>
        <nav aria-label="Navegação pública">
          <Link href="/#produto">Produto</Link>
          <Link href="/planos">Planos</Link>
          <Link href="/entrar">Entrar</Link>
          <ActionLink href="/cadastro">Criar conta</ActionLink>
          <ThemeSwitch initial={theme} />
        </nav>
      </header>
      <main id="conteudo" tabIndex={-1}>
        {children}
      </main>
      <footer className="public-footer">
        <Wordmark />
        <p>Mais conversas. Mais negócios.</p>
        <nav aria-label="Informações legais">
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos</Link>
        </nav>
      </footer>
    </>
  );
}
