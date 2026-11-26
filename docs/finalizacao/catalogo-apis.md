# APIs implementadas — Venda Flow AI

Gerado dos contratos atuais. Rotas comerciais ainda não implementadas (mensagens WhatsApp, checkout, IA e e-mail) não são apresentadas como disponíveis.

## API cliente

| Método | Caminho | Operação | Acesso |
| --- | --- | --- | --- |
| GET | `/health` | health | Público / protocolo de identidade |
| GET | `/ready` | readiness | Público / protocolo de identidade |
| GET | `/v1/openapi.json` | openapi | Público / protocolo de identidade |
| GET | `/v1/auth/login` | login | Público / protocolo de identidade |
| GET | `/v1/auth/callback` | callback | Público / protocolo de identidade |
| POST | `/v1/auth/logout` | logout | Sessão e política do backend |
| GET | `/v1/me` | me | Sessão e política do backend |
| GET | `/v1/organizations` | listOrganizations | Sessão e política do backend |
| POST | `/v1/organizations` | createOrganization | Sessão e política do backend |
| GET | `/v1/organizations/{organizationId}` | getOrganization | Sessão e política do backend |
| PATCH | `/v1/organizations/{organizationId}` | updateOrganization | Sessão e política do backend |
| GET | `/v1/memberships` | listMemberships | Sessão e política do backend |
| POST | `/v1/organizations/{organizationId}/memberships` | createMembership | Sessão e política do backend |
| PATCH | `/v1/organizations/{organizationId}/memberships/{membershipId}` | updateMembership | Sessão e política do backend |
| GET | `/v1/contacts` | listContact | Sessão e política do backend |
| POST | `/v1/contacts` | createContact | Sessão e política do backend |
| GET | `/v1/contacts/{id}` | getContact | Sessão e política do backend |
| PATCH | `/v1/contacts/{id}` | updateContact | Sessão e política do backend |
| POST | `/v1/contacts/{id}/archive` | archiveContact | Sessão e política do backend |
| GET | `/v1/opportunities` | listOpportunity | Sessão e política do backend |
| POST | `/v1/opportunities` | createOpportunity | Sessão e política do backend |
| GET | `/v1/opportunities/{id}` | getOpportunity | Sessão e política do backend |
| PATCH | `/v1/opportunities/{id}` | updateOpportunity | Sessão e política do backend |
| POST | `/v1/opportunities/{id}/archive` | archiveOpportunity | Sessão e política do backend |
| GET | `/v1/tasks` | listTask | Sessão e política do backend |
| POST | `/v1/tasks` | createTask | Sessão e política do backend |
| GET | `/v1/tasks/{id}` | getTask | Sessão e política do backend |
| PATCH | `/v1/tasks/{id}` | updateTask | Sessão e política do backend |
| POST | `/v1/tasks/{id}/archive` | archiveTask | Sessão e política do backend |
| GET | `/v1/knowledge` | listKnowledgeEntry | Sessão e política do backend |
| POST | `/v1/knowledge` | createKnowledgeEntry | Sessão e política do backend |
| GET | `/v1/knowledge/{id}` | getKnowledgeEntry | Sessão e política do backend |
| PATCH | `/v1/knowledge/{id}` | updateKnowledgeEntry | Sessão e política do backend |
| POST | `/v1/knowledge/{id}/archive` | archiveKnowledgeEntry | Sessão e política do backend |
| GET | `/v1/workflows` | listWorkflow | Sessão e política do backend |
| POST | `/v1/workflows` | createWorkflow | Sessão e política do backend |
| GET | `/v1/workflows/{id}` | getWorkflow | Sessão e política do backend |
| PATCH | `/v1/workflows/{id}` | updateWorkflow | Sessão e política do backend |
| POST | `/v1/workflows/{id}/archive` | archiveWorkflow | Sessão e política do backend |
| GET | `/v1/reports/overview` | commercialOverview | Sessão e política do backend |
| GET | `/v1/reports/history` | commercialHistory | Sessão e política do backend |
| POST | `/v1/workflows/{id}/activate` | activateWorkflow | Sessão e política do backend |
| POST | `/v1/workflows/{id}/pause` | pauseWorkflow | Sessão e política do backend |
| GET | `/v1/workflows/{id}/executions` | workflowExecutions | Sessão e política do backend |
| GET | `/v1/plans` | publicPlans | Público / protocolo de identidade |
| GET | `/v1/consents` | listConsentRecord | Sessão e política do backend |
| POST | `/v1/consents` | createConsentRecord | Sessão e política do backend |
| GET | `/v1/privacy/requests` | listPrivacyRequest | Sessão e política do backend |
| POST | `/v1/privacy/requests` | createPrivacyRequest | Sessão e política do backend |
| GET | `/v1/privacy/requests/{id}/export` | exportPrivacyRequest | Sessão e política do backend |

## API interna separada

| Método | Caminho | Operação | Acesso |
| --- | --- | --- | --- |
| GET | `/health` | adminHealth | Público / protocolo de identidade |
| GET | `/ready` | adminReady | Público / protocolo de identidade |
| GET | `/v1/me` | adminMe | Sessão e política do backend |
| GET | `/v1/plans` | adminListPlans | Sessão e política do backend |
| POST | `/v1/plans` | adminCreatePlan | Sessão e política do backend |
| POST | `/v1/plans/{id}/publish` | adminpublishPlan | Sessão e política do backend |
| POST | `/v1/plans/{id}/retire` | adminretirePlan | Sessão e política do backend |
| GET | `/v1/auth/login` | adminAuthlogin | Público / protocolo de identidade |
| GET | `/v1/auth/callback` | adminAuthcallback | Público / protocolo de identidade |
| POST | `/v1/auth/logout` | adminLogout | Sessão e política do backend |
| GET | `/v1/openapi.json` | adminOpenApi | Público / protocolo de identidade |
