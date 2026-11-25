# APIs — Venda Flow AI

Contrato inicial: venda-api/contracts/venda.openapi.yaml (OpenAPI 3.0.3). 31 caminhos, 43 operações. Disponível também em GET /v1/openapi.json quando a API estiver rodando. Nenhuma URL produtiva foi inventada.

## APIs internas implementadas

| Método | Caminho | Operação |
|---|---|---|
| GET | /health | health |
| GET | /ready | readiness |
| GET | /v1/openapi.json | openapi |
| GET | /v1/auth/login | login |
| GET | /v1/auth/callback | callback |
| POST | /v1/auth/logout | logout |
| GET | /v1/me | me |
| GET | /v1/organizations | listOrganizations |
| POST | /v1/organizations | createOrganization |
| GET | /v1/organizations/{organizationId} | getOrganization |
| PATCH | /v1/organizations/{organizationId} | updateOrganization |
| GET | /v1/memberships | listMemberships |
| POST | /v1/organizations/{organizationId}/memberships | createMembership |
| PATCH | /v1/organizations/{organizationId}/memberships/{membershipId} | updateMembership |
| GET | /v1/contacts | listContact |
| POST | /v1/contacts | createContact |
| GET | /v1/contacts/{id} | getContact |
| PATCH | /v1/contacts/{id} | updateContact |
| POST | /v1/contacts/{id}/archive | archiveContact |
| GET | /v1/opportunities | listOpportunity |
| POST | /v1/opportunities | createOpportunity |
| GET | /v1/opportunities/{id} | getOpportunity |
| PATCH | /v1/opportunities/{id} | updateOpportunity |
| POST | /v1/opportunities/{id}/archive | archiveOpportunity |
| GET | /v1/tasks | listTask |
| POST | /v1/tasks | createTask |
| GET | /v1/tasks/{id} | getTask |
| PATCH | /v1/tasks/{id} | updateTask |
| POST | /v1/tasks/{id}/archive | archiveTask |
| GET | /v1/knowledge | listKnowledgeEntry |
| POST | /v1/knowledge | createKnowledgeEntry |
| GET | /v1/knowledge/{id} | getKnowledgeEntry |
| PATCH | /v1/knowledge/{id} | updateKnowledgeEntry |
| POST | /v1/knowledge/{id}/archive | archiveKnowledgeEntry |
| GET | /v1/workflows | listWorkflow |
| POST | /v1/workflows | createWorkflow |
| GET | /v1/workflows/{id} | getWorkflow |
| PATCH | /v1/workflows/{id} | updateWorkflow |
| POST | /v1/workflows/{id}/archive | archiveWorkflow |
| GET | /v1/reports/overview | commercialOverview |
| POST | /v1/workflows/{id}/activate | activateWorkflow |
| POST | /v1/workflows/{id}/pause | pauseWorkflow |
| GET | /v1/workflows/{id}/executions | workflowExecutions |

## Uso e permissões

- Sessão opaca em cookie __Host-venda_session: HttpOnly, Secure, SameSite=Lax.
- Nas coleções comerciais, organizationId é obrigatório na query; o servidor verifica membership e objetos, e PostgreSQL aplica FORCE RLS. Cabeçalhos não sobrescrevem o tenant.
- Escritas exigem X-CSRF-Token, Origin exata e Idempotency-Key; alterações/arquivamentos/transições exigem If-Match com a versão atual. Viewer só consulta; billing não acessa o comercial.
- Ativar/pausar automações: owner, admin ou manager. Automações disponíveis criam tarefas internas por oportunidade ganha ou tarefa criada. Recibos confirmam a execução; salvar rascunho não ativa. Tarefas automáticas não encadeiam novos fluxos.
- GET de coleções: q, limit (1–100) e cursor. Arquivados saem da lista e permanecem consultáveis por ID autorizado.
- Propostas em centavos de BRL; oportunidades ganhas não são receita recebida. confirmedRevenueCents permanece null até uma origem financeira real ser integrada.
- O worker usa login próprio, sem role de API, e só pode executar a função privada de processamento. Retry com backoff/jitter, limite de dez tentativas e dead_lettered_at no outbox.

## Provedores externos e operações ainda pendentes

| Integração | APIs / referências | Estado real |
|---|---|---|
| OIDC | discovery, authorization, token, JWKS do issuer configurado | Keycloak real local; realm e dados persistentes em D |
| WhatsApp Business Platform | [Cloud API oficial](https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform), POST /{versão}/{phone-number-id}/messages e webhooks oficiais | Conta Meta/WABA/número/token/app secret não fornecidos. Envio, recebimento e conexão oficial não foram implementados/validados. |
| Assinaturas Mercado Pago | [Assinaturas](https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/create-preapproval/post), POST /preapproval e GET /preapproval/{id}; webhooks/reconciliação | Conta, aplicação, credenciais, planos e valores reais não fornecidos. Cobrança/entitlements ainda não operacionais. |
| IA / RAG | Provedor/modelo privado a configurar | Conhecimento textual tem CRUD; inferência, ingestão de arquivos e indexação RAG ainda não implementadas. |
| E-mail transacional | SMTP/serviço autorizado a configurar | Recuperação de senha por e-mail e convites por e-mail ainda indisponíveis. Nenhum envio simulado. |
| Console admin | venda-admin / venda-admin-api separados da sessão cliente | Console do produto e identidade interna com MFA ainda não implementados. O admin técnico do Keycloak não é o console do produto. |

/v1/conversations ainda não é uma API operacional: não há WhatsApp configurado e não foram inventadas conversas. O catálogo acima enumera o que existe, não endpoints futuros como se já funcionassem.
