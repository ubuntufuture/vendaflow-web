# Venda Flow AI API de fundação

Etapa 03 isolada, branch `backend/etapa-03-identidade-tenancy-api`. NestJS 12, TypeScript strict, PostgreSQL, OIDC e sessão própria do produto. Implementação candidata, sem deploy. Os documentos canônicos de arquitetura, segurança, PRD V01–V24 e `referencias/venda-openapi.yaml` ainda não foram fornecidos, inclusive no GitHub conectado vazio. O contrato local não substitui essas referências.

## Executar e verificar

Na raiz do repositório, `npm --prefix venda-api ci`, `npm --prefix venda-api run build`, `npm --prefix venda-api test`, `npm --prefix venda-api run contract` e `npm --prefix venda-api run verify`. O teste exige os binários PostgreSQL da plataforma e cria um cluster dedicado em `venda-api/.runtime`, com credenciais aleatórias apenas de teste, sem usar bancos existentes. Windows x64 foi efetivamente testado. Não há SQLite, pg-mem ou PGlite substituindo RLS. Nenhum usuário do sistema operacional é criado.

O teardown encerra o PostgreSQL e remove somente o diretório exclusivo dessa execução, após verificar caminho real, ausência de link e de marcador de processo ativo. Para diagnóstico local pode-se optar por KEEP_TEST_CLUSTER=true; isso não faz parte do runtime produtivo. Uma rodada foi cancelada por falta de espaço em disco; somente clusters DEMO_ONLY já encerrados foram limpos, e a suíte foi repetida com sucesso.

O artefato de produção fica em `build/`; testes e simulador OIDC ficam somente em `test/`/`dist/test/`, excluídos do build de produção. Dependências de teste são devDependencies. O entrypoint produtivo é `npm start` dentro de `venda-api`, com configuração real injetada no ambiente conforme `.env.example`; nenhum `.env` é carregado ou criado automaticamente. Sem variáveis obrigatórias, o processo falha com diagnóstico por nome e sem valor secreto.

O operador deve provisionar login PostgreSQL dedicado com apenas a role `venda_api`, sem membership em `venda_owner`, `venda_authorizer`, `venda_bootstrap` ou `venda_identity`. A API não executa migrations na inicialização. O job de migration usa credencial separada, `MIGRATION_CA_PEM` e `MIGRATION_EXPECTED_DATABASE` em produção. Executar `npm run migrate -- up` somente após revisar o contrato e o alvo. `down` é destrutivo e só aceita NODE_ENV=test, host loopback e nome `venda_test_*`; não é procedimento de rollback de produção ou restauração de dados.

## Módulos e fronteiras

- `src/auth.ts`: OIDC Authorization Code + PKCE S256/state/nonce; validação explícita JWS/JWKS, issuer/audience/expiração; fluxo de uso único criptografado; sessão opaca revogável e guardas.
- `src/policy.ts` e `src/foundation.ts`: resolução de tenant por membership ativo, política de papel por uso, checagem de objeto e idempotência transacional.
- `src/database.ts`: pool limitado, transactions com `set_config(..., true)` equivalente a SET LOCAL, rollback e reset do contexto; readiness de role/RLS.
- `migrations`: nove tabelas sob RLS FORCE, roles NOLOGIN/NOBYPASSRLS para funções restritas, auditoria append-only, índices e unicidade.
- `src/events.ts`: Outbox/Inbox locais e ports de fases futuras. Não há SDK de gateway, fila, worker ou disparo de mensagem.
- `src/http.ts` e `src/telemetry.ts`: erro uniforme, requestId próprio, logs por allowlist, spans e métricas OTLP opcionais, sem valores pessoais.

Sessões usam cookie `__Host-venda_session`, HttpOnly, Secure, SameSite=Lax, Path=/ e sem Domain. Alterações exigem Origin exato e token sincronizador em X-CSRF-Token, obtido no `/v1/me` autenticado com no-store. Sessão absoluta padrão de oito horas e idle de trinta minutos são limites técnicos configuráveis, ainda sujeitos à governança; não representam plano comercial. Touch do idle é amortizado, sem serializar toda leitura da mesma sessão. Sessão é revalidada dentro da transação de domínio.

Aplicação cliente e API devem estar em implantação same-site compatível com SameSite=Lax. CORS aceita somente APP_ORIGIN com credenciais. A API não confia em Host/X-Forwarded-* para construir callback ou selecionar tenant; as URLs vêm da configuração validada. OIDC aceita HTTP somente em NODE_ENV=test e loopback. Produção exige HTTPS e TLS PostgreSQL com CA validada, sem `sslmode` que possa desabilitar a checagem pela URL.

O papel cliente `admin` não é staff. Nenhuma rota de console interno existe nesta API. `venda-admin-api` requer outra aplicação, issuer/client/sessão/DB role e MFA segundo contrato interno aprovado; não foi criada por inferência. Roles de cliente: owner/admin/manager/agent/viewer/billing. owner/admin gerem organizações e associações; demais papéis não fazem mutações de domínio. Usuário sem memberships pode criar sua primeira organização; com memberships existentes, precisa ser owner/admin. Isso é proposta explícita do contrato candidato, não regra de PRD comprovada.

## Referências e evidências

[Contrato candidato](contracts/foundation.openapi.yaml), [decisões de contrato](contracts/README.md), [segurança e threat model](../docs/backend/SEGURANCA.md), [validação e limites](../docs/backend/VALIDACAO.md), [backlog](../docs/backend/BACKLOG.md).

O gate `npm run verify -- --release` deve falhar enquanto faltarem as referências, compatibilidade e validação do provedor externo. Não basta cadastrar uma variável de “aprovado”. As provas locais não autorizam deploy nem implementam etapas seguintes.
