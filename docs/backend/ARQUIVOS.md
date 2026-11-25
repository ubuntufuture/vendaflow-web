# Arquivos da etapa backend

Raiz local: `C:/Users/UBUNTU FUTURE/VendaFlowAi`.

| Arquivos | Conteúdo |
| --- | --- |
| .gitignore; .env.example; README.md | Exclusões de artefatos/segredos e acesso à etapa backend |
| venda-api/package.json; venda-api/package-lock.json | API isolada, dependências e comandos reproduzíveis |
| venda-api/tsconfig.json; venda-api/tsconfig.build.json | TypeScript strict; build produtivo separado de testes |
| venda-api/.env.example; venda-api/README.md | Variáveis pendentes e operação sem credenciais inventadas |
| venda-api/contracts/README.md; venda-api/contracts/foundation.openapi.yaml | Contrato candidato anterior ao código, sem substituir referência ausente |
| venda-api/src/app.ts; venda-api/src/main.ts | Fundação NestJS, rotas, middlewares, bootstrap e shutdown |
| venda-api/src/auth.ts; venda-api/src/policy.ts | OIDC/sessão/CSRF/guardas e política por membership |
| venda-api/src/config.ts; venda-api/src/dto.ts | Validação de ambiente, TLS e DTOs estritos |
| venda-api/src/database.ts; venda-api/src/migrate.ts | Transações com contexto local, readiness e runner de migrations |
| venda-api/src/foundation.ts | Organizações/memberships e idempotência autorizada |
| venda-api/src/events.ts | Auditoria/outbox atômicos, inbox deduplicado e ports sem gateway |
| venda-api/src/http.ts; venda-api/src/telemetry.ts | RequestId, erros uniformes, logs por allowlist, trace e métricas OTLP |
| venda-api/migrations/001_foundation.up.sql; venda-api/migrations/001_foundation.down.sql | Nove tabelas, roles restritas, RLS FORCE, triggers, índices e down restrito |
| venda-api/test/config.test.ts; venda-api/test/foundation.test.ts; venda-api/test/telemetry.test.ts | Testes de configuração/política, integração real/contrato/performance e OTLP |
| venda-api/test/postgres.ts; venda-api/test/idp.ts | Fixtures DEMO_ONLY: PostgreSQL real e simulador OIDC assinado, fora do build produtivo |
| venda-api/scripts/write-contract.mjs; venda-api/scripts/contract.mjs; venda-api/scripts/verify.mjs | Geração/validação de contrato e gates verificáveis |
| venda-api/evidencias/resultados.xml; venda-api/evidencias/integracao.json | JUnit completo e cenários da suíte com versão PostgreSQL |
| venda-api/evidencias/regressao-ui.txt | Typecheck e 20 testes de regressão da UI existente |
| venda-api/evidencias/contrato.json; venda-api/evidencias/npm-audit.json; venda-api/evidencias/telemetria.json | Contrato, dependências e exportação OTLP local |
| venda-api/evidencias/performance*.json | Observações p75/p95 e baselines anteriores, inclusive falhas corrigidas |
| venda-api/evidencias/verificacao.json; venda-api/evidencias/gate-release.json; venda-api/evidencias/fontes-sha256.json | Gates e hashes das fontes avaliadas |
| docs/backend/SEGURANCA.md; docs/backend/VALIDACAO.md; docs/backend/BACKLOG.md; docs/backend/ARQUIVOS.md | Threat model, resultados, pendências e inventário |

`node_modules`, `build`, `dist`, `.runtime` e `.env` não são versionados. Nenhum arquivo de UI, branding, UX ou contrato canônico existente foi alterado.
