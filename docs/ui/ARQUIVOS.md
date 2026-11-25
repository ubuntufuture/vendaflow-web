# Arquivos da etapa UI

Todos os caminhos são relativos à raiz `C:/Users/UBUNTU FUTURE/VendaFlowAi`. As capturas individuais estão indexadas em TELAS.md e telas.json; os demais artefatos de teste estão em evidencias.

| Caminhos criados ou alterados | Conteúdo |
| --- | --- |
| README.md; .gitignore; .env.example | Entrada das etapas, exclusões de build/cache e diagnóstico sem credenciais |
| package.json; package-lock.json; tsconfig.json; vitest.config.ts | Dependências fixadas no lock, TS strict e comandos de teste/build |
| branding/tokens.json; branding/brandboard.png; branding/README.md; branding/licenses/Inter-OFL.txt | Contrato visual, referência íntegra, proveniência e licença da fonte |
| packages/ui/package.json; packages/ui/components/index.ts | Entry point reutilizável de componentes sem telas do sandbox |
| packages/ui/components/primitives.tsx; packages/ui/components/icons.tsx | Controles, feedback, estados e ícones funcionais |
| packages/ui/components/shell.client.tsx; packages/ui/components/gallery.client.tsx | Interatividade isolada: navegação/filtros e catálogo DEMO_ONLY |
| packages/ui/screens.tsx | Renderização server-first das telas candidatas |
| packages/ui/styles/tokens.css; packages/ui/styles/ui.css | Tokens gerados e estilos responsivos/acessíveis |
| packages/ui/stories/Components.stories.tsx; packages/ui/stories/Screens.stories.tsx | Cenários de componentes, estados e telas desktop/mobile |
| packages/ui/tests/setup.ts; packages/ui/tests/components.test.tsx | Setup e testes de interação/semântica |
| .storybook/main.ts; .storybook/preview.tsx; .storybook/preview-head.html | Storybook, temas, viewports e locale pt-BR |
| sandbox/ui-review/next.config.ts; sandbox/ui-review/tsconfig.json; sandbox/ui-review/next-env.d.ts; sandbox/ui-review/README.md | Catálogo Next 16 local, export estático e documentação |
| sandbox/ui-review/app/layout.tsx; sandbox/ui-review/app/page.tsx | Fonte local, estilos, metadados e índice de revisão |
| sandbox/ui-review/app/telas/[id]/page.tsx; sandbox/ui-review/app/componentes/page.tsx; sandbox/ui-review/app/identidade/page.tsx | Rotas de revisão, componentes e comparação do PNG |
| sandbox/ui-review/public/referencia/brandboard.png | Referência exclusiva da página comparativa, sem uso como logo |
| scripts/build-tokens.mjs; scripts/build-screen-stories.mjs | Geração reproduzível de tokens e cenários |
| scripts/audit-ui.mjs; scripts/verify-ui.mjs | Auditoria visual/estática e gates da etapa |
| scripts/serve-ui.mjs; scripts/test-ui-browser.mjs | Servidor loopback, axe, teclado, trace, screenshots e diff |
| scripts/analyze-ui.mjs; scripts/measure-ui.mjs | Bundle analyzer oficial e Lighthouse por perfil/rota |
| docs/ui/DESIGN-SYSTEM.md; docs/ui/FIGMA.md; docs/ui/FIDELIDADE.md | Guidelines, handoff e comparação visual |
| docs/ui/BACKLOG.md; docs/ui/VALIDACAO.md; docs/ui/PERFORMANCE.md; docs/ui/ARQUIVOS.md | Pendências P0/P1/P2, execução, medições e inventário |
| docs/ui/budgets.json; docs/ui/TELAS.md; docs/ui/telas.json | Budgets laboratoriais e catálogo de capturas |
| docs/ui/evidencias/*.json; docs/ui/evidencias/lighthouse/*.json.gz | Relatórios de testes, auditoria, baseline, Lighthouse e gates |
| docs/ui/evidencias/bundle-analyzer/*.html | Relatórios cliente/server/edge do analisador; edge sem bundle executável |
| docs/ui/evidencias/telas/*.png; docs/ui/evidencias/diff-repetibilidade.png; docs/ui/evidencias/interacoes-playwright.zip | Capturas, comparação, diff e trace |

`.next`, `out`, `storybook-static` e `node_modules` ficam ignorados no Git e são reproduzíveis pelos comandos. Os arquivos da etapa UX foram preservados; apenas README e .gitignore da raiz receberam informações da nova etapa. Nenhum arquivo de API/DB foi criado ou alterado.
