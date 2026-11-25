import Link from "next/link";
import { Wordmark } from "../../components/ui";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout">
      <header className="auth-brand">
        <Link href="/" aria-label="Venda Flow AI — início">
          <Wordmark />
        </Link>
        <p>Mais conversas. Mais negócios.</p>
      </header>
      <main id="conteudo" tabIndex={-1} className="auth-main">
        {children}
        <nav className="legal-links" aria-label="Informações de acesso">
          <Link href="/">Voltar ao site</Link>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos</Link>
        </nav>
      </main>
    </div>
  );
}
