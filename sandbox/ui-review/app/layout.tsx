import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import '../../../packages/ui/styles/tokens.css';
import '../../../packages/ui/styles/ui.css';
export const metadata: Metadata = { title: 'Venda Flow AI — revisão de UI', description: 'Catálogo local de identidade visual e telas. Sem operações de negócio.', robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="pt-BR" data-theme="light"><body>{children}</body></html>; }
