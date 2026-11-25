import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies, headers } from "next/headers";
import "../../packages/ui/styles/tokens.css";
import "../../packages/ui/styles/ui.css";
import "./web.css";
import "./stitch.css";
import { Vitals } from "../components/vitals.client";
import { isLocalReview } from "../lib/review";
const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  display: "swap",
  weight: "100 900",
  variable: "--font-inter-local",
});
export const metadata: Metadata = {
  title: {
    default: "Venda Flow AI — Mais conversas. Mais negócios.",
    template: "%s | Venda Flow AI",
  },
  description:
    "Atendimento comercial, contatos e vendas conversacionais para empresas brasileiras.",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/venda-flow-symbol.png" },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await headers(); // CSP nonce requires request-time rendering.
  const theme =
    (await cookies()).get("vf-theme")?.value === "dark" ? "dark" : "light";
  return (
    <html lang="pt-BR" data-theme={theme} className={inter.variable}>
      <body>
        <a className="vf-skip-link" href="#conteudo">
          Pular para o conteúdo
        </a>
        {isLocalReview() && (
          <aside className="vf-notice" role="status">
            <strong>DEMO_ONLY — revisão local.</strong>
            <span>
              Use somente dados de teste. Este ambiente não representa operação
              em produção.
            </span>
          </aside>
        )}
        {children}
        <Vitals />
      </body>
    </html>
  );
}
