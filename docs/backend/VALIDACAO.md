# Validação da fundação backend

## Resultado e contrato disponível

Etapa 03 na branch `backend/etapa-03-identidade-tenancy-api`, derivada de `848e782`. A fundação NestJS é própria do Venda Flow AI, com pacote e lockfile separados da UI. Foram implementados identidade/sessão, guardas, autorização por membership/role, organizações, associações, PostgreSQL/RLS, idempotência, auditoria, outbox/inbox, requestId/erros e telemetria. Nenhum gateway, frontend, admin-api, worker, deploy ou recurso AWS foi implementado nesta etapa.

Leitura inicial confirmou `branding/tokens.json` e `branding/brandboard.png` da etapa UI. Arquitetura geral, segurança/governança, PRD V01–V24 e `referencias/venda-openapi.yaml` permanecem ausentes; o GitHub conectado foi consultado e continua vazio. O contrato candidato `venda-api/contracts/foundation.openapi.yaml` foi gerado antes da implementação, sem sobrescrever ou fingir compatibilidade com a referência ausente. Seus campos e decisões precisam de reconciliação antes de produção. Não foi substituída uma arquitetura existente, nem inventado um ADR aprovado.

OpenAPI 3.0.3 válido, 12 paths/14 operações: health/readiness, documentação, login/callback/logout, me, organizações e memberships. Os seis endpoints comerciais citados nos prompts não foram criados como stubs ou dados falsos. A API cliente não possui rotas internas de administração; cliente `admin` não é identidade de staff.

## Banco e migrations

Schema `venda`: users, sessions, auth_flows, organizations, memberships, idempotency, audit, outbox e inbox. Todos têm RLS ENABLE/FORCE. Há unicidade de issuer/sub, organização/usuário, idempotência por ator/escopo/key e inbox por organização/source/evento. Locale/moeda fixos pt-BR/BRL; timezone validado diretamente sem enumerar o catálogo de zonas a cada escrita. Identificadores são UUIDs imutáveis e dados de exemplo existem somente nas fixtures DEMO_ONLY.

Migration `001_foundation.up.sql` exige migrator separado; role runtime não tem superuser/bypass/ownership nem membership nas roles privilegiadas. Há funções SECURITY DEFINER restritas, com roles NOLOGIN/NOBYPASSRLS e policies explícitas, para bootstrap/identidade/autorização. SQL de domínio é parametrizado. O runner tem checksum e serialização por advisory lock. Em produção exige CA e confirmação do nome do banco dedicado; não aceita parâmetros de TLS na URL que possam relaxar a validação.

`down` só pode executar em NODE_ENV=test, loopback e database `venda_test_*`; foi testado seguido de `up`. Remove dados e schema do cluster descartável, não restaura dados e não é rollback de produção. Backups/DR reais permanecem pendentes. As credenciais locais foram aleatórias, geradas em memória, sem banco/usuário/serviço de outro produto. Os processos PostgreSQL criados pelos testes foram encerrados.

## Testes efetivamente executados

Ambiente: Windows x64, Node v24.19.0, NestJS 12.6.0, PostgreSQL 18.7 real, compilado por MSVC. Docker não estava disponível como daemon; foram usados binários reais de `embedded-postgres` (devDependency, empacotamento beta), sem mock de SQL/RLS. O IdP local é um simulador de protocolo DEMO_ONLY com RSA/JWKS e verificação criptográfica real pelo openid-client; não é um fornecedor real ou sandbox externo.

| Comando a partir de venda-api | Resultado e evidência |
| --- | --- |
| `npm test` | 28 PASS, zero falhas/cancelamentos/skips, em resultados.xml; 22 casos da integração PostgreSQL, cinco de configuração/política e um de OTLP |
| `npm run build` | Build de produção separado, TypeScript strict; teste/simulador não entram em build |
| `npm run contract` | PASS: OpenAPI 3.0.3 válido, 12 paths; compatibilidade canônica não demonstrada |
| `npm audit --json` | Zero vulnerabilidades conhecidas na consulta final registrada em npm-audit.json |
| `npm run verify` | Exit 0, oito PASS; resultado em verificacao.json |
| `npm run verify -- --release` | Exit 1, oito PASS e quatro FAIL por documentos/compatibilidade/PRD/provedor externo pendentes; ver gate-release.json |

Regressão das camadas anteriores, executada na raiz: `npm run typecheck` passou e `npm test` passou nos 20 testes da UI (um arquivo). Saída preservada em `venda-api/evidencias/regressao-ui.txt`; nenhum componente visual foi alterado.

Provas de integração: tenant A não acessa/altera B por path/body/query/header; objeto de B não atravessa path de A; viewer/agent/manager/billing recebem 403 em mutações; admin não promove owner/admin; RLS também bloqueia SQL direto sob a role runtime; SET LOCAL não vaza no pool; idempotência concorrente cria um único evento; auditoria é append-only; rollback desfaz audit/outbox/inbox; último owner é protegido; sessão opaca rotaciona, expira por TTL/idle e é revogada; CSRF/origem/DTO/content-type/request size são validados; assinatura/state/replay/nonce/issuer/audience/expiração OIDC inválidos são recusados; provedor indisponível não derruba operação local; respostas reais satisfazem schemas OpenAPI; readiness rejeita RLS inadequada; down/up recompõe o banco descartável.

OpenTelemetry foi exportado por OTLP para collector loopback, com payloads de trace e métrica efetivamente recebidos. Nenhum fornecedor foi chamado. Sem endpoints OTLP configurados não há exporter ativo. Não foram gravados payloads pessoais/segredos em logs; a suíte testa tokens/CSRF/query/corpo com marcadores e exige allowlist de campos. Segurança e limites estão em SEGURANCA.md.

Histórico relevante: o launcher Windows inicialmente reteve handles, corrigido e instância encerrada; o parser apontou required vazio no OpenAPI, corrigido; testes detectaram a necessidade de verificação JWS explícita, falha de leitura do viewer por locks de UPDATE e contenção de sessão, corrigidas antes da rodada final. Relatórios iniciais foram preservados como histórico de falhas, sem apresentá-los como PASS. O teste de configuração também prova que um down fora do banco descartável é recusado antes de abrir conexão.

Clusters descartáveis acumulados esgotaram o disco em uma tentativa intermediária. Foram removidos somente diretórios DEMO_ONLY desta suíte, com caminho validado e PostgreSQL já encerrado. A fixture agora remove seu próprio cluster ao terminar, após validar caminho e ausência de processo ativo; `KEEP_TEST_CLUSTER=true` permite retenção explícita para diagnóstico. A rodada final completou com `.runtime` vazio.

## Performance local e limites de inferência

Relatório final: `venda-api/evidencias/performance.json`, com cada observação e p75/p95. Perfil: 100 requisições (50 GET de organização e 50 POST de criação), concorrência 5, pool 10, 54 organizações e 60 memberships DEMO_ONLY ao fim da janela, sessões aquecidas e sem cache de resposta. Origem loopback Windows, sem chamadas externas na medição, CPU AMD PRO A10-9700 e aproximadamente 7,4 GB de RAM. Dados têm tamanho de teste, não escala produtiva acordada.

Última rodada de 28 testes: GET p75 51,21 ms/p95 68,09 ms; POST p75 79,77 ms/p95 92,06 ms; zero erros em 100 solicitações. Percentil por nearest rank, amostra pequena. Ambos passam no budget local de GET p95 ≤300 ms e POST p95 ≤500 ms. A medição não prova SLA de RDS/ECS nem desempenho de produção ou de rede móvel.

A baseline anterior à correção do timezone registrou POST p95 de 1368,87 ms, com tempo dentro da transaction e não no commit. A validação direta substituiu a varredura de `pg_timezone_names`, preservando a validação server-side e sem desligar durabilidade. A rodada final tem métricas concretas; não alegar impossibilidade de regressão nem extrapolar para alto volume.

Landing, app-shell, Lighthouse, LCP/INP/CLS e RUM não foram medidos nesta etapa backend. Nenhuma promessa de “abrir em menos de 1 segundo”. O perfil de carga/dataset produtivo, percentis sob escala real e regressão distribuída ainda precisam ser acordados. Os números da etapa UI foram preservados e não reutilizados como prova desta API.

## Checklist de aceite

| Critério | Status | Evidência ou bloqueio |
| --- | --- | --- |
| Branch própria e escopo backend | PASS | Camadas anteriores preservadas; sem etapa seguinte |
| Auth guard, policy, requestId, DTO e erro uniforme | PASS local | Testes reais HTTP e configuração |
| Tenant A não lê/escreve B por path/body/query/header | PASS local | HTTP + SQL direto com role runtime sem bypass |
| Viewer recebe 403 em mutações de domínio | PASS | Não inclui logout da própria sessão, operação de segurança |
| RLS FORCE, transactions SET LOCAL, unique/idempotência | PASS | PostgreSQL 18.7 real, pool/replay/rollback/concorrência |
| Sessão/cookie/CSRF e JWTs inválidos | PASS local | Cookie attributes e protocolo assinado em loopback; TLS real pendente |
| OpenAPI válido e respostas reais conformes | PASS candidato | 12 paths/14 operações e validação runtime por schema |
| Compatibilidade com venda-openapi.yaml | FAIL | Referência canônica ausente |
| PRD/arquitetura/segurança reconciliados | FAIL | Referências ausentes |
| Telemetria e logs sem segredo | PASS local | OTLP recebido no collector e allowlist testada |
| GET/POST dentro dos budgets | PASS local | 100 requisições, perfil acima; produção não comprovada |
| Provedor externo, MFA, TLS/KMS e backups produtivos | FAIL para liberação | Não configurados/testados; sem credenciais reais |
| Gateway/WhatsApp/worker/API admin | N/A ao runtime desta fase | Somente fronteiras/ports; nenhum serviço falso |
| Marca e telas auditadas nesta etapa | N/A | Sem UI nova/alterada; tokens/brandboard lidos e preservados |
| Conclusão integral de produção | FAIL | Gate externo permanece bloqueado |

Próxima ação recomendada: obter e reconciliar os contratos canônicos, validar o provedor OIDC/MFA e o ambiente de segurança antes de liberar produção ou iniciar a próxima etapa. Nenhuma etapa seguinte foi executada.
