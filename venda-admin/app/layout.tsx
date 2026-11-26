import type{Metadata}from'next';import localFont from'next/font/local';import{headers}from'next/headers';import'../../packages/ui/styles/tokens.css';import'../../packages/ui/styles/ui.css';import'./admin.css';
const inter=localFont({src:'../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',weight:'100 900',display:'swap',variable:'--font-inter-local'});
export const metadata:Metadata={title:'Admin | Venda Flow AI',robots:{index:false,follow:false},icons:{icon:'/brand/venda-flow-symbol.png'}};
export default async function Layout({children}:{children:React.ReactNode}){await headers();return <html lang="pt-BR" data-theme="light" className={inter.variable}><body><a className="vf-skip-link" href="#conteudo">Pular para o conteúdo</a>{children}</body></html>;}
