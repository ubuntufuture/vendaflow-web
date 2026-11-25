# Contrato candidato da fundação

Criado antes da implementação da etapa 03. O contrato canônico `referencias/venda-openapi.yaml`, PRD V01–V24, arquitetura e segurança não foram fornecidos. `foundation.openapi.yaml` é uma proposta isolada deste módulo, não substitui nem alega compatibilidade comprovada com o contrato ausente. Nenhum endpoint comercial dos seis caminhos de referência foi criado.

Papéis autorizados pelo pedido: owner, admin, manager, agent, viewer, billing. Identidade OIDC é verificada no servidor e sessão é opaca, revogável, em cookie HttpOnly/Secure/SameSite=Lax. O token CSRF é retornado apenas ao usuário autenticado por `/v1/me`, com Cache-Control no-store. Toda mutação exige Origin exato e X-CSRF-Token, além da política de papel e membership ativo.

Rotas propostas: health/readiness e contrato; iniciar/retornar OIDC e logout; me; listar/criar/consultar/editar organizações; listar/adicionar/alterar memberships. Criação de organização cria owner atomicamente. IDs são UUIDs imutáveis gerados pelo servidor. Locale/moeda fixos pt-BR/BRL; timezone IANA explícito e validado. Não se criou política de assinatura, preço ou consentimento comercial.

Escopo do tenant é selecionado por path ou query explicitamente contratados, nunca por claim/body arbitrário. Header X-Organization-Id só pode concordar com o seletor contratado; X-Tenant-Id não é aceito. Campos extras são rejeitados, inclusive tenantId/organizationId em bodies onde não existem no contrato. `/v1/organizations` sem seletor lista apenas memberships ativos do usuário. `/v1/memberships` exige organizationId e só permite listagem da equipe a owner/admin/manager; demais papéis veem apenas sua associação.

viewer não pode executar mutações de domínio. Logout é uma operação de segurança da própria sessão e continua permitido com CSRF. owner/admin gerem organização/memberships; admin não pode promover a owner/admin nem alterar owner/admin. Último owner ativo não pode ser removido/rebaixado. Repetição de mutações exige Idempotency-Key e payload/escopo idênticos; conflito retorna 409. Autorização é revalidada antes de qualquer replay.

API cliente não expõe console/admin interno. O papel cliente `admin` não é identidade de staff. `venda-admin-api` deverá ser outra aplicação com issuer/audience, sessão, DB role e guardas próprios; não é implementada nesta fase sem contrato interno. Gateways entram somente como ports sem adapters, URLs ou credenciais inventados.
