# Operação real — Venda Flow AI

## 1. Implementação efetiva

CRUD de contatos, oportunidades, tarefas, fontes textuais de conhecimento e automações persistidas. Ativação/pausa de automações internas, worker TypeScript separado e recibos de execução. Métricas de visão geral consultam PostgreSQL; não convertem proposta ou oportunidade ganha em receita recebida. UI ligada ao cliente gerado do OpenAPI, com formulários Zod, busca/paginação, controle de versão, arquivamento e estados de falha sem sucesso fictício. Wizard de automação preserva três etapas e salva rascunho real.

Identidade local real: Keycloak 26.8.2 e OpenJDK 25 portáteis verificados contra checksums oficiais; PostgreSQL 18.7 persistente em D:/VendaFlowAi-runtime. Sem usuário de aplicação, contato, oportunidade, preço ou plano pré-carregado. O bootstrap administrativo é uma credencial técnica real do provedor. O launcher não importa fixtures nem simulador OIDC. O antigo launcher de demonstração foi removido.

**Não está 100% funcional nem liberada para produção.** WhatsApp, pagamentos/entitlements, IA/RAG, e-mail transacional, console admin e fluxos completos de privacidade continuam pendentes. A falta de contas externas foi confirmada pelo usuário. Nenhum gateway, preço ou envio foi simulado para ocultar essas lacunas. Consulte FUNCIONALIDADES.md para a matriz de cobertura, EXECUCAO-LOCAL.md para operação e INTEGRACOES-PENDENTES.md para limites.

## 2. Arquivos

venda-api/src/commerce.ts, commerce.dto.ts, commerce.controller.ts; app.ts, auth.ts, config.ts, database.ts, events.ts e migrate.ts; venda-api/scripts/commercial-contract.mjs e backward-compat.mjs; venda-api/contracts/venda.openapi.yaml e commercial.openapi.yaml; venda-workers/src/main.ts, package.json e tsconfig.json; venda-web/lib/commerce.ts e commerce.server.ts; app/commerce-actions.ts; components/commerce-screen.client.tsx, commerce-route.tsx e automation-wizard.client.tsx; rota de organização e BFF de autenticação; scripts/setup-native-local.mjs, run-local.mjs, protect-local-runtime.ps1, test-web-browser.mjs e report-real-platform.mjs.

Configuração privada e dados reais: D:/VendaFlowAi-runtime. Apenas o ponteiro de localização fica em .local/, ignorado pelo Git. Nenhuma credencial está no frontend ou nos relatórios.

## 3. Contratos e migrations

Contrato inicial com 31 caminhos e 43 operações: [catálogo de APIs](APIS.md). Preserva as operações anteriores e permite somente parâmetros opcionais adicionais no callback OIDC, incluindo session_state. Compatibilidade verificada antes de dereferenciar o OpenAPI.

- 002_commercial: cinco tabelas de domínio e idempotência comercial, FORCE RLS, FKs compostas por tenant, índices, versão e identidade imutável; auditoria/outbox atômicos.
- 003_automation: estado/ativador do fluxo, recibos, função privada e roles separadas de worker/executor; retries e DLQ.
- 004_automation_locks: forward-fix da execução, substituindo locks que exigiam privilégios de UPDATE por locks consultivos compartilhados e revalidação de membership/estado. O checksum aplicado não foi sobrescrito.
- 16 tabelas com RLS FORCE. Rollback destrutivo continua restrito ao banco descartável de teste.

## 4. Testes e evidências

- npm --prefix venda-api test: última integração em venda-api/evidencias/integracao.json, JUnit em resultados.xml. 33 cenários de integração PASS; 0 FAIL. A suíte inclui ainda configuração/política e OpenTelemetry. O terminal registrou 40 testes PASS após o ajuste de session_state.
- npm run test:web: 16 testes PASS; cliente e configuração server-side.
- npm run contract:web: cliente regenerado comparado ao versionado.
- npm --prefix venda-api run contract: OpenAPI validado e compatibilidade da fundação verificada.
- npm run build:platform: compila API, worker strict e Next. PASS; o frontend foi recompilado após corrigir o wizard e o reflow mobile. Registro de comandos em evidencias/validacoes-finais.json.
- Navegador: 198 PASS / 0 FAIL com Keycloak real e realm temporário isolado. Evidência: evidencias/browser/browser.json; capturas em telas/.

Os testes usam fixtures explicitamente DEMO_ONLY em cluster e realm exclusivos de teste. Eles não populam o banco persistente da plataforma. A primeira tentativa de browser com provedor real encontrou expiração do token administrativo da fixture; a renovação foi corrigida. A validação de interoperabilidade adicionou session_state opcional sem tratá-lo como identidade/autorização. Falhas intermediárias não foram declaradas como aprovação.

## 5. Segurança e performance

RLS FORCE, role de API sem bypass nem acesso ao worker, membership revalidada por uso, viewer 403, proteção A/B por path/query/header/body, CSRF/Origin, idempotência, conflito de versão e logs sem payload foram testados. Worker não herda credenciais da API/OIDC. Segredos locais protegidos por ACL do Windows. HTTPS, KMS/Secrets Manager, WAF, MFA interno, backups restaurados, RUM e carga produtiva ainda não certificados. HTTP é permitido somente no desenvolvimento explicitamente habilitado em loopback; produção rejeita a opção.

Fundação HTTP em PostgreSQL de teste: GET p95 81,56 ms e POST p95 128,12 ms, 100 requisições, concorrência 5, sessões aquecidas, 54 organizações/60 memberships DEMO_ONLY, sem chamadas externas; Windows loopback. Medição não certifica todos os endpoints comerciais nem carga produtiva. Evidência: venda-api/evidencias/performance.json.

Resultados locais de navegador, quando completos, em evidencias/browser/performance.json: Windows, loopback, desktop 1440×1000, cache aquecido, cinco navegações por rota, sem throttling. Não equivalem a RUM ou SLA de um segundo. As telas também são verificadas em tablet 1024×768 e mobile 390×844.

## 6. Marca

Telas verificadas automaticamente em desktop/mobile: site, login/cadastro/reset, onboarding, shell, contatos, funil, tarefas, automações, relatórios e configurações. Comparação com referência em evidencias/browser/comparacao-brandboard.png; diff de repetibilidade não equivale a aprovação artística nem diff pixel a pixel contra uma tela inexistente no brandboard. Console admin não foi auditado porque ainda não está implementado.

Menu lateral claro mantido; Inter local; cinco tokens aprovados. Símbolo transparente e pictogramas preservados nas telas existentes; tema do Keycloak aplica fonte local, símbolo e pt-BR. A extração raster não é um SVG oficial aprovado.

## 7. Bloqueios

Configurar contas Meta/WhatsApp e Mercado Pago, preços e planos verdadeiros, um provedor de IA, e-mail transacional, identidade/admin separados com MFA e políticas de privacidade aprovadas. O primeiro usuário real precisa criar a própria conta no provedor; o agente não inventa identidade nem digita uma senha pessoal.

O Docker falhou ao extrair a imagem por entrada/saída, com C: em 0,71 GiB livres. Com autorização do usuário, os runtimes foram instalados em D:. Não houve fallback para identidade simulada.

## 8. Checklist

| Critério | Estado |
|---|---|
| CRUD comercial persistente e tenant isolation | PASS nos testes de integração |
| Automações internas com recibo, pausa e revogação | PASS nos testes de integração |
| Contrato inicial publicado e cliente tipado | PASS após verificações aplicáveis |
| Ambiente persistente sem seeds/mock de negócio | PASS, conforme snapshot do runtime |
| Login completo com Keycloak real no navegador | PASS |
| WhatsApp, cobrança, IA, e-mail e console admin completos | FAIL / pendentes |
| Plataforma 100% funcional e pronta para produção | FAIL |

## 9. Próximos passos

P0: criar a conta real do usuário; implementar e validar integrações oficiais, billing/entitlements e console admin isolado. P1: consentimento/DSAR, e-mail, contratos de carga, recuperação de backup e avaliação assistiva. P2: importação/exportação, relatórios históricos e otimização de alto volume após o contrato desses fluxos. Não houve publicação nem deploy produtivo.
