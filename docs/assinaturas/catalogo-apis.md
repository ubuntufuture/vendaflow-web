# Catálogo de APIs — 28/11/2026

Contrato implementado; disponibilidade local não significa integração externa validada. Sessões cliente e interna são separadas.

## Cliente

Fonte: `venda-api/contracts/venda.openapi.yaml`. 41 caminhos; 55 operações.

| Método | Caminho | Operação |
| --- | --- | --- |
| GET | `/health` | health |
| GET | `/ready` | readiness |
| GET | `/v1/openapi.json` | openapi |
| GET | `/v1/auth/login` | login |
| GET | `/v1/auth/callback` | callback |
| POST | `/v1/auth/logout` | logout |
| GET | `/v1/me` | me |
| GET | `/v1/organizations` | listOrganizations |
| POST | `/v1/organizations` | createOrganization |
| GET | `/v1/organizations/{organizationId}` | getOrganization |
| PATCH | `/v1/organizations/{organizationId}` | updateOrganization |
| GET | `/v1/memberships` | listMemberships |
| POST | `/v1/organizations/{organizationId}/memberships` | createMembership |
| PATCH | `/v1/organizations/{organizationId}/memberships/{membershipId}` | updateMembership |
| GET | `/v1/contacts` | listContact |
| POST | `/v1/contacts` | createContact |
| GET | `/v1/contacts/{id}` | getContact |
| PATCH | `/v1/contacts/{id}` | updateContact |
| POST | `/v1/contacts/{id}/archive` | archiveContact |
| GET | `/v1/opportunities` | listOpportunity |
| POST | `/v1/opportunities` | createOpportunity |
| GET | `/v1/opportunities/{id}` | getOpportunity |
| PATCH | `/v1/opportunities/{id}` | updateOpportunity |
| POST | `/v1/opportunities/{id}/archive` | archiveOpportunity |
| GET | `/v1/tasks` | listTask |
| POST | `/v1/tasks` | createTask |
| GET | `/v1/tasks/{id}` | getTask |
| PATCH | `/v1/tasks/{id}` | updateTask |
| POST | `/v1/tasks/{id}/archive` | archiveTask |
| GET | `/v1/knowledge` | listKnowledgeEntry |
| POST | `/v1/knowledge` | createKnowledgeEntry |
| GET | `/v1/knowledge/{id}` | getKnowledgeEntry |
| PATCH | `/v1/knowledge/{id}` | updateKnowledgeEntry |
| POST | `/v1/knowledge/{id}/archive` | archiveKnowledgeEntry |
| GET | `/v1/workflows` | listWorkflow |
| POST | `/v1/workflows` | createWorkflow |
| GET | `/v1/workflows/{id}` | getWorkflow |
| PATCH | `/v1/workflows/{id}` | updateWorkflow |
| POST | `/v1/workflows/{id}/archive` | archiveWorkflow |
| GET | `/v1/reports/overview` | commercialOverview |
| GET | `/v1/reports/history` | commercialHistory |
| POST | `/v1/workflows/{id}/activate` | activateWorkflow |
| POST | `/v1/workflows/{id}/pause` | pauseWorkflow |
| GET | `/v1/workflows/{id}/executions` | workflowExecutions |
| GET | `/v1/billing/plans` | billingPlans |
| GET | `/v1/billing/status` | billingStatus |
| POST | `/v1/billing/checkout` | billingCheckout |
| POST | `/v1/billing/subscriptions/{id}/cancel` | billingcancel |
| POST | `/v1/billing/subscriptions/{id}/reconcile` | billingreconcile |
| GET | `/v1/plans` | publicPlans |
| GET | `/v1/consents` | listConsentRecord |
| POST | `/v1/consents` | createConsentRecord |
| GET | `/v1/privacy/requests` | listPrivacyRequest |
| POST | `/v1/privacy/requests` | createPrivacyRequest |
| GET | `/v1/privacy/requests/{id}/export` | exportPrivacyRequest |

## Admin interno

Fonte: `venda-admin-api/contracts/admin.openapi.yaml`. 10 caminhos; 11 operações.

| Método | Caminho | Operação |
| --- | --- | --- |
| GET | `/health` | adminHealth |
| GET | `/ready` | adminReady |
| GET | `/v1/me` | adminMe |
| GET | `/v1/plans` | adminListPlans |
| POST | `/v1/plans` | adminCreatePlan |
| POST | `/v1/plans/{id}/publish` | adminpublishPlan |
| POST | `/v1/plans/{id}/retire` | adminretirePlan |
| GET | `/v1/auth/login` | adminAuthlogin |
| GET | `/v1/auth/callback` | adminAuthcallback |
| POST | `/v1/auth/logout` | adminLogout |
| GET | `/v1/openapi.json` | adminOpenApi |
