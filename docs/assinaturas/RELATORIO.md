# Venda Flow AI Planos de teste e processamento de assinaturas

Atualização de 28/11/2026. Ambiente local persistente, não produção.

## 1. Implementação efetiva

Foram cadastrados os três planos de teste solicitados pelo usuário. Eles são registros reais no PostgreSQL local, identificados como TESTE, separados das ofertas de produção e editáveis pelo fluxo de nova versão no dashboard administrativo.

| Plano | Valor mensal | Recursos cadastrados para teste | Limites cadastrados para teste |
| --- | --- | --- | --- |
| TESTE — Essencial | R$ 10,00 | CRM | 100 contatos; 1 membro |
| TESTE — Equipe | R$ 20,00 | CRM, WhatsApp e relatórios | 1.000 contatos; 5 membros; 100 conversas/mês |
| TESTE — Completo | R$ 30,00 | CRM, WhatsApp, IA, automações e relatórios | 5.000 contatos; 10 membros; 500 conversas/mês; 10.000 tokens de IA/mês |

Os valores e limites são de teste, escolhidos conforme autorização expressa do usuário; não constituem preços reais de produção, disponibilidade de integração ou promessa de uso ilimitado. Nenhuma assinatura ou cobrança foi criada pelo cadastro. O bootstrap foi repetido e preservou as versões existentes, sem duplicar registros ou sobrescrever alterações futuras do operador. Não foram criados clientes, contatos ou conversas fictícios.

O faturamento da aplicação agora consulta catálogo e situação por API. A preparação de checkout, o cancelamento e a reconciliação são intenções persistidas em uma fila transacional, processadas por um worker com credencial de banco própria. Respostas HTTP 202 significam solicitação aceita, não pagamento confirmado. Não há chamada ao Mercado Pago dentro da transação HTTP da API.

Criação com timeout ou lease expirada fica em revisão e não repete POST automaticamente. Cancelamentos usam consulta anterior à escrita e podem ser confirmados localmente apenas quando o sistema comprova que a criação ainda não foi enviada. Um resultado incerto não é apresentado como cancelamento concluído. Preços e periodicidade retornados pelo provedor são conferidos contra a versão do plano; a URL de checkout precisa pertencer ao mesmo identificador de assinatura.

**O checkout real continua desabilitado.** O usuário confirmou que ainda não existe um ambiente HTTPS da Venda Flow AI. Nenhuma URL foi inventada. A conta Mercado Pago foi revalidada apenas para leitura em 28/11: Brasil, autenticação confirmada e marcador de conta de teste presente.

## 2. Arquivos criados ou alterados

- `venda-api/src/billing/billing.ts` e `billing.controller.ts`: consultas, permissões e comandos de faturamento.
- `venda-api/src/billing/subscriptions-client.ts`: validação do recurso, preço, periodicidade e vínculo da URL de checkout.
- `venda-api/src/config.ts`, `database.ts`, `events.ts` e `app.ts`: configuração, isolamento, eventos e composição.
- `venda-api/scripts/billing-contract.mjs`, contratos da API e cliente gerado da web.
- `venda-workers/src/billing/processor.ts`, `main.ts`, `billing.env.example` e `test/billing.test.mjs`.
- `venda-web/app/billing-actions.ts`, `components/billing-route.tsx` e `billing-screen.client.tsx`; rota de faturamento.
- `venda-admin-api/src/plans.ts`, contrato e integração; formulários e tipos de `venda-admin` para ambiente TESTE/produção.
- `scripts/setup-local-test-plans.mjs`, `setup-local-billing.mjs`, `run-local.mjs`, `protect-local-runtime.ps1`, `check-local-real.mjs` e testes de navegador.
- Migrações 009–013, documentação e evidências desta pasta. Configuração e credenciais ficam no runtime privado em D:, fora do Git.

## 3. Contratos e banco

Contrato cliente: 41 caminhos; cinco novos caminhos de faturamento, documentados no [catálogo de APIs](catalogo-apis.md):

| Método e caminho | Comportamento |
| --- | --- |
| GET `/v1/billing/plans` | Catálogo publicado para o ambiente configurado, condicionado ao membership e papel de faturamento |
| GET `/v1/billing/status` | Situação persistida, disponibilidade do checkout e ausência de pagamento verificado enquanto a comprovação não estiver implementada |
| POST `/v1/billing/checkout` | Intenção durável e idempotente; preço vem do banco, não do formulário |
| POST `/v1/billing/subscriptions/{id}/cancel` | Solicita cancelamento e aguarda confirmação do processamento |
| POST `/v1/billing/subscriptions/{id}/reconcile` | Agenda consulta ao provedor; não confia em estado enviado pelo browser |

As consultas usam `organizationId`; mutações exigem sessão, Origin/CSRF e Idempotency-Key. Owner, admin e billing podem operar; viewer, agent e manager não recebem permissão financeira por mera visibilidade de botão. A referência original não existia; a compatibilidade do contrato da fundação foi preservada e os clientes foram regenerados.

- **009:** ambiente imutável do plano, namespace TESTE reservado, ocultação do catálogo público de produção e origem auditável do bootstrap local.
- **010:** assinaturas, comandos com leases/retries e idempotência; três tabelas FORCE RLS; roles e funções restritas do worker.
- **011:** correção de EXECUTE público em funções existentes. Revogação explícita nos schemas do produto e grants por serviço. A revogação anterior apenas por schema não removia o privilégio global padrão do PostgreSQL. Testes agora comprovam que a API cliente não executa funções de worker nem o resolvedor de identidade interna.
- **012:** falhas que esgotam tentativas passam a revisão explícita.
- **013:** FK composta impede divergência entre ambiente do plano e da assinatura; outro administrador ativo pode recuperar um cancelamento cujo solicitante perdeu permissão.

Os checksums já aplicados de 009–011 foram conferidos e preservados; as correções seguintes são migrações incrementais. O rollback destrutivo segue restrito a clusters descartáveis `venda_test_*`. O banco local tem 22 tabelas no schema cliente e 6 no interno, todas com FORCE RLS.

## 4. Testes e evidências

| Comando | Resultado |
| --- | --- |
| `npm --prefix venda-api test` | 59 PASS / 0 FAIL, regressão final com PostgreSQL real |
| `npm run test:admin-api` | 4 PASS / 0 FAIL, incluindo TESTE oculto do catálogo de produção e ambiente imutável |
| `npm run test:billing` | 9 PASS / 0 FAIL, PostgreSQL real, API HTTP real e transporte de provedor controlado DEMO_ONLY |
| `npm run test:web` | 16 PASS / 0 FAIL |
| `npm run test:web:browser` com `VENDA_TEST_REAL_OIDC=true` | 205 PASS / 0 FAIL, Keycloak real e PostgreSQL isolado |
| `npm run test:admin:browser` | 13 PASS / 0 FAIL; evidência em `evidencias/admin-browser/resultado.json` |
| `npm --prefix venda-api run contract`, `npm run contract:web`, `npm run contract:admin` | Contratos válidos e clientes gerados conferidos |
| Builds de API, worker, web, admin-api e admin | Concluídos; saída e rotas verificadas durante a execução |
| `npm run setup:test-plans`, repetido | Três registros criados e depois preservados, sem duplicação |

Evidências: `integracao-billing.json`, `browser/browser.json`, `browser/performance.json`, `planos-teste-criacao.json`, `planos-teste.json` e `mercadopago-conexao.json`, nesta pasta, além das suítes de API e admin em seus diretórios. As fixtures de transporte não são integração oficial de cobrança: o banco, a API e o worker são reais, mas nenhuma assinatura externa foi criada por esses testes.

A primeira rodada revelou o privilégio EXECUTE excessivo e uma fixture de revogação que referenciava coluna inexistente. Ambos foram corrigidos e as suítes repetidas. Os testes novos incluem: concorrência sem duplicação, timeout após criação, expiração de lease, preço divergente, cancelamento antes/depois do envio, timeout após cancelamento, recuperação após revogação e isolamento por ambiente/tenant. O teste de Origin hostil gera recusa esperada no log do Next; isso faz parte da verificação, não um fluxo aceito.

`npm run verify:web` também foi executado, mas agrega verificações estáticas e evidências históricas: não é apresentado como nova execução de Lighthouse, Storybook ou auditoria manual nesta data.

## 5. Segurança e performance

O browser não recebe token Mercado Pago nem credencial de banco. O worker de cobrança usa um login próprio com NOBYPASSRLS, sem associação aos papéis da API, admin ou worker de automações. A API não executa os entrypoints privados de billing. Revalidação de membership ocorre ao receber a intenção e ao consumir comandos de usuário; a consulta operacional periódica ao provedor é identificada separadamente como reconciliador.

O cadastro de planos TESTE foi uma operação administrativa local solicitada pelo usuário, executada com a credencial técnica de migração e auditada com `origin=local_test_setup`. Não foi criada sessão de usuário, não foi simulado MFA e não se atribuiu a operação a uma interação autenticada na UI. O script não é importado pelo runtime, recusa banco remoto/produção e não altera versões já existentes.

POST de criação com resultado ambíguo não é repetido. Outras operações têm até oito tentativas, espera exponencial limitada com jitter e revisão após esgotamento. Resultados antigos não reativam uma assinatura cancelada. Falhas externas não bloqueiam operações comerciais locais. O estado `authorized` do Mercado Pago não é interpretado como recebimento; `paymentVerified` permanece falso e não há liberação paga de recursos sem comprovação financeira.

Na API local, concorrência 5 e sessões aquecidas: GET p95 95.24 ms (50 requisições, 0 erros); POST p95 130.16 ms (50 requisições, 0 erros), sem chamadas externas. As medições de API estão em `venda-api/evidencias/performance.json`; as de navegador, nesta pasta. São laboratório Windows em loopback, sem rede móvel ou borda regional, e não constituem SLA. No Chrome 158, desktop 1440×1000, cache aquecido e cinco amostras por rota, FCP p75/p95: landing 200/216 ms; login 136/188 ms; shell 168/224 ms. Não há RUM produtivo ou garantia universal de abertura em 1 segundo. Não foi medido um perfil produtivo de carga do Mercado Pago.

## 6. Fidelidade à marca

Inter local, os cinco tokens existentes, símbolo e navegação clara foram preservados. O faturamento reutiliza os componentes e padrões visuais existentes, com labels em pt-BR e valores BRL reais do catálogo TESTE. Capturas de cenários com dados de teste estão identificadas como DEMO_ONLY em ambiente descartável. Não foram adicionadas estatísticas, fotos ou depoimentos fictícios. Axe e reflow foram verificados nas jornadas de navegador; a aprovação visual final e a auditoria assistiva manual continuam pendentes.

## 7. Bloqueios e backlog P0 P1 P2

| Prioridade | Pendência |
| --- | --- |
| P0 | Ambiente HTTPS real de retorno/notificação, confirmado ausente pelo usuário. O checkout e o worker externo continuam desabilitados. |
| P0 | Validar criação/autorização/cancelamento no sandbox oficial com comprador de teste autorizado e URL real. A autenticação de leitura foi confirmada, mas não substitui esse teste. |
| P0 | Endpoint de webhook, segredo oficial, inbox durável e processamento das notificações. O validador HMAC existente não comprova entrega de webhook. |
| P0 | Comprovação de parcelas/pagamentos, tratamento de estornos/reembolsos/chargebacks e entitlements/limites efetivamente aplicados a partir de recebimentos verificados. Nada disso é inferido de `authorized`. |
| P0 | Recuperação operacional completa de criação ambígua sem provider ID; o sistema bloqueia repetição e mostra revisão, mas ainda precisa de reconciliação administrativa com o provedor. |
| P0 | WhatsApp oficial, IA/RAG, e-mail e acesso completo, privacidade/retenção/exclusão e infraestrutura produtiva continuam conforme o backlog anterior. |
| P1 | Detalhamento comercial/contratual final, operação de DLQ pelo admin, monitoramento e alertas do worker, políticas de cobrança/cancelamento aprovadas. |
| P2 | Otimizações orientadas por RUM e melhorias adicionais de navegação após o fechamento dos gates P0. |

## 8. Checklist PASS FAIL N A

| Critério | Resultado |
| --- | --- |
| Três planos TESTE cadastrados sem inventar ofertas de produção | PASS |
| Operador pode criar novas versões e preservar histórico | PASS |
| Catálogo TESTE não aparece como oferta de produção | PASS |
| Intenções duráveis, isolamento A/B, viewer negado, CSRF e idempotência | PASS |
| Worker isolado, lease, timeout sem duplicar criação e cancelamento confirmado | PASS nos cenários locais executados |
| Pagamento não comprovado jamais tratado como assinatura paga | PASS |
| Checkout/assinatura ponta a ponta no sandbox oficial | FAIL / bloqueado por HTTPS e configuração pendente |
| Webhook, parcelas comprovadas, entitlements e políticas financeiras completos | FAIL / pendentes |
| Liberação de produção e plataforma 100% funcional | FAIL |
| Alteração visual de marca ou criação de dados de clientes | N/A — não foram solicitadas nem executadas |

## 9. Próxima etapa

Definir o ambiente HTTPS autorizado da Venda Flow AI e concluir notificações, comprovação financeira e entitlements antes de permitir contratação real. Enquanto isso, os planos TESTE podem ser alterados no dashboard pelo fluxo de nova versão. A existência do catálogo não autoriza publicação de preços de teste em produção nem substitui aprovação dos preços definitivos.

Referências oficiais: [criação de assinatura](https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/create-preapproval/post), [gerenciamento](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/subscription-management), [webhooks](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/notifications/webhooks), [faturas autorizadas](https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/authorized-payment-search/get). A documentação foi consultada nesta etapa; não representa execução de cobrança real.
