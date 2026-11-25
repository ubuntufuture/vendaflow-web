# Inventário — etapa 04

Raiz: C:/Users/UBUNTU FUTURE/VendaFlowAi.

| Caminhos | Conteúdo |
| --- | --- |
| venda-web/app/layout.tsx; venda-web/app/web.css | Layout base, Inter local, tokens e responsividade |
| venda-web/app/(public)/ | Landing, planos e documentos legais pendentes |
| venda-web/app/(auth)/ | Login, cadastro e recuperação pelo provedor OIDC |
| venda-web/app/(workspace)/ | Layout privado, seleção de organização, onboarding, módulos e boundaries |
| venda-web/app/actions.ts | Server Actions de organização e logout, origem/CSRF/idempotência |
| venda-web/app/v1/auth/[action]/route.ts; venda-web/app/auth/callback/route.ts | Bridge fixo e alias do callback OIDC |
| venda-web/app/not-found.tsx | Estado seguro de página inexistente |
| venda-web/components/ | UI reutilizável server-first; formulário, tema, menu responsivo e Web Vitals como ilhas cliente |
| venda-web/lib/api.generated.ts; venda-web/lib/api.server.ts | Cliente OpenAPI gerado e transporte somente servidor |
| venda-web/lib/transport.ts; venda-web/test/transport.test.ts | Prazo total de headers/corpo, limite de resposta e testes negativos de rede |
| venda-web/lib/security.ts; validation.ts; modules.ts | Configuração, cookies selecionados, Zod e apresentação de navegação |
| venda-web/proxy.ts; next.config.ts | CSP com nonce, headers e limites de Server Actions |
| venda-web/tsconfig.json; next-env.d.ts; vitest.config.ts | TypeScript strict, tipos Next e configuração de teste |
| venda-web/.env.example; README.md | Variáveis sem segredos, operação, fronteiras e limites |
| venda-web/test/security.test.ts; postgres-adapter.mjs | Testes de segurança e adapter PostgreSQL nativo DEMO_ONLY, fora da aplicação |
| venda-web/stories/Foundation.stories.tsx | Cinco histórias de auth/estados, isoladas do runtime produtivo |
| scripts/test-web-browser.mjs; test-web-storybook.mjs | Integração real, a11y, teclado, isolamento e histórias |
| scripts/measure-web.mjs; check-web-contract.mjs; smoke-web.mjs; verify-web.mjs | Lighthouse, proveniência gerada, smoke produtivo e gates |
| .storybook/main.ts; .storybook/preview.tsx | Inclusão das novas histórias e estilos do frontend |
| package.json; package-lock.json | Dependências Zod/openapi e comandos do workspace frontend |
| .gitignore; .env.example; README.md | Exclusão de runtime/segredos e acesso à etapa |
| docs/frontend/rotas.json | Mapeamento explícito do catálogo UX e bloqueios comerciais |
| docs/frontend/ARQUITETURA.md; BACKLOG.md; FIDELIDADE.md; VALIDACAO.md | Fluxos, ameaças, P0/P1/P2, marca e resultados |
| docs/frontend/evidencias/ | Relatórios JSON, Lighthouse comprimido, trace público, capturas, diff e bundle analyzer |

Não versionar .next, node_modules, .runtime, env local ou credenciais. Não foram alterados backend, branding, componentes das fases anteriores, docs/ux ou docs/ui. O Storybook recebe apenas novas histórias/estilos desta fase. Nenhuma infraestrutura ou etapa 05 foi executada.
