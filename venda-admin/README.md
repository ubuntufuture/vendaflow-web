# Console interno — web

Next.js server-first, pt-BR e BRL, fonte Inter local e mesmos cinco tokens da Venda Flow AI. Menu lateral claro. Símbolo PNG transparente existente; não é apresentado como SVG aprovado. Tela de acesso, catálogo vazio, criação de rascunho, confirmação de publicação/retirada, histórico de versões, erros e layout mobile.

O cliente TypeScript em `lib/api.generated.ts` é gerado do contrato da API interna. Cookies internos HttpOnly/Secure/SameSite são encaminhados apenas pelo BFF em servidor. A UI não acessa banco, não recebe credenciais do gateway e não decide autorização ou entitlements.

`npm run generate:admin`, `npm run typecheck:admin` e `npm run build:admin` são executados na raiz. Consulte `../venda-admin-api/README.md` para configuração, limitações e execução local. Valores usados em testes aparecem somente como DEMO_ONLY em ambiente descartável.
