# Console interno — API

NestJS separado da API cliente. O código reutiliza apenas o cliente de protocolo OIDC e o formato de logs compilados de `venda-api`; não reutiliza usuários, cookies, sessões ou chaves. O deploy precisa empacotar essas bibliotecas compiladas. A extração futura para um pacote compartilhado não autoriza compartilhar identidade ou credenciais.

O contrato está em `contracts/admin.openapi.yaml`. Rotas: `/health`, `/ready`, `/v1/openapi.json`, `/v1/auth/login`, `/v1/auth/callback`, `/v1/auth/logout`, `/v1/me`, `/v1/plans`, `/v1/plans/{id}/publish` e `/v1/plans/{id}/retire`.

Perfis internos: `platform_admin`, `billing_admin` e `support_viewer`. O último consulta, mas não altera o catálogo. Autenticação exige ID token assinado do issuer interno, AMR `pwd` e `otp`, além de `auth_time` recente. Sessões duram dez minutos; mutações exigem MFA nos últimos cinco minutos. O papel e a revogação local são consultados novamente a cada operação. A remoção de papel no IdP afeta o próximo login; para revogação imediata durante uma sessão vigente é necessário desativar a identidade local. Ainda falta interface operacional para essa administração.

Cada plano nasce como rascunho, sem preço ou recurso predefinido. Publicação exige CSRF, Origin, chave de idempotência e revisão `If-Match`. Uma versão publicada substitui a anterior do mesmo código. Preços históricos são imutáveis. Um recurso selecionado no catálogo não comprova integração disponível nem assinatura paga. Limites ausentes não significam uso ilimitado. O vínculo do catálogo a cobranças e entitlements ainda está pendente.

O schema `venda_admin` tem seis tabelas com FORCE RLS. O login runtime recebe somente `venda_admin_api`, sem bypass. A API cliente recebe apenas leitura de versões publicadas do catálogo; não recebe acesso às sessões internas. Os dois schemas pertencem ao mesmo produto, no PostgreSQL local dedicado da Venda Flow AI.

## Execução local

1. Compile `npm run build:api` e `npm run build:admin-api` na raiz.
2. Execute as migrações até 008 usando a credencial migradora, nunca a runtime.
3. Inicie o Keycloak real com `node scripts/start-local-identity.mjs` na raiz.
4. Configure o e-mail autorizado em `VENDA_FIRST_ADMIN_EMAIL` e execute `npm run setup:admin:identity`. O script provisiona a identidade sem senha pessoal.
5. Execute `npm run setup:admin:runtime` e aplique `scripts/protect-local-runtime.ps1`.
6. O próprio administrador executa `powershell -NoProfile -File scripts/set-local-admin-password.ps1`. A senha é solicitada de forma oculta e enviada por stdin ao provedor local; não aparece em argumentos nem em arquivo.
7. Compile `npm run build:admin` e execute `npm run start:admin:local`. Abra `http://127.0.0.1:3401`. O administrador deve cadastrar seu TOTP no provedor. Após a primeira inscrição, um novo login pode ser necessário para comprovar a execução de ambos os fatores; a API não aceita apenas o cadastro do autenticador como prova de uso do OTP.

O primeiro acesso administrativo real com senha e TOTP foi concluído pelo usuário e confirmado no Chrome em 26/11/2026; evidência em `../docs/finalizacao/evidencias/admin-acesso-real.json`. Não há SMTP configurado, comprovação de posse do e-mail ou entrega de convite. A configuração local HTTP é exclusiva de loopback e não é um deploy produtivo.

## Verificações

`npm --prefix venda-admin-api test` usa PostgreSQL real descartável e IdP assinado de teste. Para HDD, defina `VENDA_TEST_RUNTIME_DIR` e `VENDA_TEST_PG_PROCESS_TIMEOUT_MS=240000`. As fixtures são DEMO_ONLY; não comprovam autenticação TOTP interativa no Keycloak.

`node scripts/test-admin-browser.mjs` exercita a interface em banco descartável e publica apenas evidências DEMO_ONLY. Exige os builds e fixtures compilados. O logotipo tipográfico está excluído da análise automática de contraste por ser marca; o conteúdo e os controles permanecem auditados.

Referências: [AMR e mappers oficiais](https://www.keycloak.org/admin-api/protocol-mappers), [fluxos de autenticação](https://www.keycloak.org/docs/26.8.0/server_admin/). As referências AMR pertencem às execuções reais obrigatórias de senha e OTP, sem mapper que declare MFA fixo.
