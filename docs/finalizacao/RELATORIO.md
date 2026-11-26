# Venda Flow AI — implementação e validação em andamento

## 1. Resumo do que foi efetivamente implementado

Nesta branch foram implementados consentimentos por finalidade/canal, solicitações de privacidade e exportação autorizada; histórico operacional por período e fuso IANA; console interno separado para cadastrar, versionar, publicar e retirar planos; catálogo público que consulta somente versões publicadas. A publicação não cria uma assinatura nem concede recursos. O frontend permanece ligado às APIs reais, sem sementes comerciais na aplicação persistente.

Foram adicionados o port HTTP de assinaturas Mercado Pago e validadores de assinatura de webhook. Esses módulos têm testes de transporte/criptografia, mas **ainda não estão conectados a um ciclo completo de cobrança, reconciliação ou envio WhatsApp**. Não são apresentados como integrações operacionais concluídas.

O vínculo do Phone Number ID à conta informada foi confirmado por GET na Meta, HTTP 200. A consulta não enviou mensagens nem vinculou a credencial global a uma organização cliente.

**A plataforma não está 100% funcional e não está liberada para produção.** A seção 7 registra dependências externas e trabalho de implementação ainda necessário.

## 2. Arquivos criados/alterados

- `venda-admin/`: aplicação Next.js interna, cliente OpenAPI gerado, BFF de autenticação, formulários de plano, estados vazios/erro e layout responsivo claro.
- `venda-admin-api/`: NestJS interno, configuração, sessão, avaliação de MFA/RBAC, banco, catálogo versionado, contrato e integração PostgreSQL.
- `venda-api/src/privacy.ts`, `privacy.controller.ts`, `billing/subscriptions-client.ts`, `integrations/webhook-signatures.ts`, `oidc.ts`; composição em `app.ts`, eventos e guardas de banco.
- `venda-api/migrations/005_privacy.up.sql` até `008_admin_plans.up.sql`.
- `venda-web/components/privacy-route.tsx`, `privacy-screen.client.tsx`, `commercial-history.tsx`; ações e BFF de exportação; página pública de planos e tipos gerados.
- `scripts/setup-local-admin-identity.mjs`, `setup-local-admin-runtime.mjs`, `run-local-admin.mjs`, `set-local-admin-password.ps1`, `set-local-admin-password.mjs`, `check-local-real.mjs`, `check-whatsapp-sandbox.mjs`, `check-admin-contract.mjs` e `test-admin-browser.mjs`.
- Contratos, testes, evidências e catálogo de APIs nesta pasta. Arquivos privados de runtime ficam em D:, fora do Git.

## 3. Contratos de API e DB alterados

Contrato cliente: **36 caminhos**, incluindo `/v1/consents`, `/v1/privacy/requests`, exportação, `/v1/reports/history` e `/v1/plans` público. Contrato interno: **10 caminhos**, com identidade e catálogo de planos próprios. Veja [catálogo completo](catalogo-apis.md). Os clientes TypeScript são gerados e comparados com os contratos. A fundação anterior foi preservada; o OpenAPI original do produto não existia, conforme informado pelo usuário. Não se alega compatibilidade com uma referência ausente.

- 005: ledger de consentimento, solicitações e idempotência; 007 reforça append-only.
- 006: índices para o histórico operacional.
- 008: schema `venda_admin`, seis tabelas FORCE RLS, roles internas, sessões e catálogo de versões imutáveis. A API cliente lê somente planos publicados e não lê sessões internas.
- Migrações 1–8 aplicadas no banco local persistente. Schema cliente: 19 tabelas FORCE RLS; schema interno: 6. Roles runtime sem superuser/bypass. Rollback destrutivo somente em bancos descartáveis de teste.

## 4. Testes executados

Comandos na raiz do repositório, salvo indicação:

| Comando | Resultado confirmado |
| --- | --- |
| `npm --prefix venda-api test` | 59 PASS, 0 FAIL; PostgreSQL 18.7 real e IdP assinado de teste. Inclui isolamento A/B, CSRF, cookies, idempotência, privacidade, catálogo e rollback descartável. |
| `npm run test:admin-api` | 3 PASS, 0 FAIL; PostgreSQL real. Inclui MFA assinado/recente, fronteira cliente/admin, suporte somente leitura e preços imutáveis. Não comprova TOTP interativo real. |
| `npm run test:web` | 16 PASS, 0 FAIL. A primeira tentativa foi impedida pelo sandbox do esbuild; a execução autorizada passou. |
| `npm --prefix venda-api run contract` e `npm run contract:web` | PASS: 36 caminhos e cliente gerado compatível. |
| `npm run contract:admin` | PASS: 10 caminhos e cliente gerado idêntico. |
| `npm run build:api`, `npm run build:admin-api`, `npm run build:web`, `npm run build:admin` | Builds concluídos. |
| `npm run test:web:browser` com `VENDA_TEST_REAL_OIDC=true` | 201 PASS, 0 FAIL, suíte completa; sem erros de hidratação após a correção. |
| `npm run test:admin:browser` | 13 PASS, 0 FAIL; seis telas axe sem violações, PostgreSQL real e protocolo OIDC de teste, sem TOTP interativo real. |
| `npm run check:whatsapp` | GET autenticado e vínculo dos IDs confirmados; zero mensagens enviadas. |
| `node scripts/check-local-real.mjs` | APIs e páginas locais HTTP 200, migrações 1–8, RLS e roles verificadas. |

A rodada completa final do cliente passou com **201 PASS / 0 FAIL**, usando Keycloak real e PostgreSQL real isolado. O console passou com **13 PASS / 0 FAIL**, com seis telas axe sem violações e IdP de protocolo assinado de teste. Resultados em `evidencias/browser/browser.json` e `evidencias/admin-browser/resultado.json`. A rodada anterior encontrou quatro erros de hidratação no relatório: o React 19 rejeitava filhos múltiplos no título SVG. A correção usa uma string única e a regressão completa passou. A falha anterior e a reprodução SSR foram preservadas. Houve também timeout de preparação/encerramento dos clusters no HDD; o prazo foi ajustado somente nas fixtures. Não se omitem esses incidentes nem se usam capturas históricas como prova atual.

A inicialização dos clusters usa `VENDA_TEST_RUNTIME_DIR=D:/VendaFlowAi-runtime/test-clusters` e `VENDA_TEST_PG_PROCESS_TIMEOUT_MS=240000`. Esses ajustes não alteram deadlines runtime nem resultados funcionais.

## 5. Segurança & performance

Sessões internas e clientes têm issuer, cookies e chaves distintos. Escritas internas exigem sessão, papel, CSRF/Origin, idempotência e MFA recente; cada operação reconsulta autorização. Senha/TOTP são execuções obrigatórias reais do Keycloak com mapper AMR oficial; não há claim de MFA fixo. A identidade inicial foi provisionada sem gerar senha pessoal. O administrador definiu sua senha e cadastrou TOTP. O usuário confirmou o acesso, o catálogo foi observado no Chrome e o backend registra uma sessão interna ativa no banco persistente. Essa validação real está em `evidencias/admin-acesso-real.json`, separada das fixtures. A posse do e-mail continua sem verificação. Nenhuma senha ou segredo TOTP foi lido pelo agente.

Medição local da API: 100 requisições, concorrência 5, sessão aquecida, loopback Windows, dataset DEMO_ONLY, sem provedores externos. Última amostra: GET p95 **101,74 ms**, POST p95 **143,65 ms**, zero erros. Hardware e observações em `venda-api/evidencias/performance.json`. Não representam capacidade produtiva acordada. Uma sonda local do console excedeu 6 s durante a rodada; a consulta seguinte retornou HTTP 200 em 2.543 ms. O incidente está preservado em `evidencias/runtime-real-sonda-transitoria.json`; não é tratado como garantia de disponibilidade ou performance. No Chrome 157, desktop 1440×1000, loopback sem throttling, cache de browser aquecido, cinco amostras por rota: FCP p75/p95 foi 156/172 ms na landing, 116/148 ms no login e 144/156 ms no shell de teste. São amostras pequenas de laboratório, não evidência de campo ou SLA. Não existe RUM produtivo nem prova de abertura universal em 1 segundo; LCP/INP/CLS de campo continuam pendentes.

Validadores de webhook não substituem endpoints públicos, inbox durável, reconciliadores ou testes reais do provedor. A exportação cobre somente o escopo descrito no JSON, com limites explícitos; exclusão e retenção ainda exigem implementação e política. Auditoria automática axe não certifica WCAG completa. A varredura de publicação identifica padrões de credenciais, com limitações documentadas, e exclui runtime, `.env`, HAR e traces com cookies.

## 6. Fidelidade à marca

Inter local, cinco cores exatas, pt-BR, BRL, símbolo PNG transparente existente e menu claro. Não foi criado SVG supostamente oficial nem reproduzida a imagem de apresentação como logotipo de produção. O cadastro de preços começa vazio; as capturas de teste com valores usam nomes e classificação DEMO_ONLY em banco descartável.

As referências HTML mapeadas anteriormente estão em `docs/ui-ativacao/HTML-REFERENCIAS.md`. Comparações anteriores não são uma aprovação automática destas novas telas. Auditoria atual do console cobre acesso, catálogo vazio, formulário, MFA expirado e catálogo desktop/mobile. Ainda falta aprovação da direção de arte e baseline visual de regressão aprovado contra as referências; não se declara igualdade pixel a pixel com o brandboard.

## 7. Bloqueios externos e backlog explícito

| Prioridade | Área | Pendência concreta |
| --- | --- | --- |
| P0 | Admin | Login real com senha/TOTP concluído pelo administrador e confirmado no Chrome. Ainda cadastrar e publicar os preços reais no console, conforme decisão do usuário. |
| P0 | WhatsApp | App Secret, configuração do webhook HTTPS e destinatário de teste autorizado. Ainda implementar persistência de mensagens, templates, estados, atribuição, janela de atendimento e envio protegido por consentimento/entitlement. IDs válidos não tornam esses fluxos prontos. |
| P0 | Mercado Pago | Preços aprovados no admin, configuração de retorno/webhook, segredo de assinatura e comprador de teste. Ainda ligar port a comandos duráveis, assinatura por organização, reconciliação, cancelamento e entitlements; sem cobrança real criada. |
| P0 | IA/conhecimento | Provedor/modelo/configuração autorizada; upload, processamento, busca/RAG, cotas e respostas fundamentadas ainda não implementados. |
| P0 | E-mail/acesso | Provedor SMTP/API e domínio remetente; recuperação, verificação e convites reais, além do primeiro cadastro completo autorizado. |
| P0 | Privacidade | Política de retenção, verificação da identidade do titular e processamento completo de exclusão/DSAR; pedidos permanecem em análise. |
| P0 | Relatórios financeiros | Origem de recebimentos comerciais comprovados. Valores de propostas e assinaturas da própria plataforma não são receita de vendas dos clientes. |
| P0 | Produção | Conta AWS/região/domínio autorizados, infraestrutura/deploy, HTTPS, segredos, monitoramento/alertas, backups e restauração testada. Nenhum deploy produtivo executado. |
| P0 | Validação | Hidratação corrigida e jornadas locais aprovadas; concluir sandboxes oficiais, teste manual assistivo, carga acordada e aceite de marca. |
| P1 | Operação | Interface de revogação de acesso interno, navegação de históricos completos/paginação além dos limites atuais e runbooks operacionais. |
| P2 | Evolução | Otimizações baseadas em RUM e capacidades adicionais após os gates P0/P1. |

## 8. Checklist PASS/FAIL/N/A

| Critério | Estado |
| --- | --- |
| API cliente e interna com contratos válidos e clientes gerados | PASS |
| Isolamento A/B, viewer bloqueado, CSRF e sessão sob PostgreSQL real | PASS |
| Catálogo com valores definidos pelo operador, rascunhos ocultos e preço histórico imutável | PASS |
| Aplicação local persistente sem dados comerciais de demonstração | PASS |
| Identidade interna com senha/TOTP reais e acesso ao catálogo | PASS local, confirmado pelo usuário, Chrome e sessão persistente |
| WhatsApp oficial com envio/recebimento e webhook validados | FAIL |
| Assinaturas, cancelamento, reconciliação e entitlements ponta a ponta | FAIL |
| IA/RAG, e-mail, exclusão completa e receita comercial comprovada | FAIL |
| Zero erro de hidratação na rodada final completa | PASS — 201 verificações |
| WCAG manual completa com tecnologia assistiva | FAIL / pendente |
| Marca aprovada e diff contra baseline final aprovado | FAIL / pendente |
| Produção, RUM, carga acordada e restauração de backup | FAIL |
| API/DB acessados diretamente pelo browser | N/A — acesso via servidor/BFF; não é uma capacidade a implementar |

## 9. Próxima etapa recomendada

Cadastrar e publicar os planos reais no console já acessível e implementar o ciclo durável de assinatura/WhatsApp com as configurações oficiais pendentes. A existência desta recomendação não significa deploy ou cobrança autorizados a terceiros. A implementação permanece em andamento; nenhum gate global de 100% foi aprovado.
