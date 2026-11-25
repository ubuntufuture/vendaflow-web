import fs from "node:fs";
import YAML from "yaml";
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const uuid = { type: "string", format: "uuid" };
const role = {
  type: "string",
  enum: ["owner", "admin", "manager", "agent", "viewer", "billing"],
};
const obj = (properties, required = Object.keys(properties)) => ({
  type: "object",
  additionalProperties: false,
  ...(required.length ? { required } : { minProperties: 1 }),
  properties,
});
const date = { type: "string", format: "date-time" };
const schemas = {
  Error: obj({
    error: obj({
      code: { type: "string" },
      message: { type: "string" },
      requestId: uuid,
    }),
  }),
  Organization: obj({
    id: uuid,
    name: { type: "string", minLength: 1, maxLength: 120 },
    timezone: { type: "string", maxLength: 100 },
    locale: { type: "string", enum: ["pt-BR"] },
    currency: { type: "string", enum: ["BRL"] },
    createdAt: date,
  }),
  Membership: obj({
    id: uuid,
    organizationId: uuid,
    userId: uuid,
    role,
    active: { type: "boolean" },
    createdAt: date,
  }),
  CreateOrganization: obj({
    name: { type: "string", minLength: 1, maxLength: 120 },
    timezone: { type: "string", maxLength: 100 },
  }),
  UpdateOrganization: obj(
    {
      name: { type: "string", minLength: 1, maxLength: 120 },
      timezone: { type: "string", maxLength: 100 },
    },
    [],
  ),
  CreateMembership: obj({ userId: uuid, role }),
  UpdateMembership: obj({ role, active: { type: "boolean" } }, []),
  Me: obj({
    user: obj({ id: uuid }),
    csrfToken: { type: "string" },
    sessionExpiresAt: date,
  }),
  Organizations: obj({
    data: { type: "array", maxItems: 100, items: ref("Organization") },
  }),
  Memberships: obj({
    data: { type: "array", maxItems: 100, items: ref("Membership") },
  }),
  Health: obj({ status: { type: "string", enum: ["ok"] } }),
};
const pathId = {
  name: "organizationId",
  in: "path",
  required: true,
  schema: uuid,
};
const membershipId = {
  name: "membershipId",
  in: "path",
  required: true,
  schema: uuid,
};
const tenantHeader = {
  name: "X-Organization-Id",
  in: "header",
  required: false,
  schema: uuid,
  description:
    "Se fornecido, deve concordar com o seletor do tenant e com membership ativo.",
};
const csrf = {
  name: "X-CSRF-Token",
  in: "header",
  required: true,
  schema: { type: "string" },
};
const idem = {
  name: "Idempotency-Key",
  in: "header",
  required: true,
  schema: { type: "string", pattern: "^[A-Za-z0-9_-]{16,128}$" },
};
const errors = Object.fromEntries(
  [400, 401, 403, 404, 409, 413, 415, 429, 500, 503].map((code) => [
    code,
    {
      description: "Erro uniforme, sem dados sensíveis",
      content: { "application/json": { schema: ref("Error") } },
    },
  ]),
);
function op(
  id,
  schema,
  {
    write = false,
    body,
    parameters = [],
    publicRoute = false,
    status = 200,
  } = {},
) {
  return {
    operationId: id,
    summary: id,
    security: publicRoute ? [] : [{ session: [] }],
    parameters: [...parameters, ...(write ? [csrf, idem] : [])],
    ...(body
      ? {
          requestBody: {
            required: true,
            content: { "application/json": { schema: ref(body) } },
          },
        }
      : {}),
    responses: {
      ...errors,
      [status]: {
        description: "Resposta confirmada",
        ...(schema
          ? { content: { "application/json": { schema: ref(schema) } } }
          : {}),
      },
    },
  };
}
const paths = {
  "/health": { get: op("health", "Health", { publicRoute: true }) },
  "/ready": { get: op("readiness", "Health", { publicRoute: true }) },
  "/v1/openapi.json": {
    get: {
      operationId: "openapi",
      security: [],
      responses: {
        200: {
          description: "Contrato candidato da fundação",
          content: { "application/json": { schema: { type: "object" } } },
        },
      },
    },
  },
  "/v1/auth/login": {
    get: {
      operationId: "login",
      security: [],
      responses: {
        ...errors,
        302: {
          description:
            "Redirecionamento OIDC com cookie de fluxo HttpOnly Secure SameSite=Lax",
        },
      },
    },
  },
  "/v1/auth/callback": {
    get: {
      operationId: "callback",
      security: [],
      parameters: [
        { name: "code", in: "query", schema: { type: "string" } },
        { name: "state", in: "query", schema: { type: "string" } },
      ],
      responses: {
        ...errors,
        302: {
          description:
            "Sessão estabelecida após validação OIDC; redirecionamento fixo configurado",
        },
      },
    },
  },
  "/v1/auth/logout": {
    post: { ...op("logout", null, { status: 204 }), parameters: [csrf] },
  },
  "/v1/me": { get: op("me", "Me") },
  "/v1/organizations": {
    get: op("listOrganizations", "Organizations"),
    post: op("createOrganization", "Organization", {
      write: true,
      body: "CreateOrganization",
      status: 201,
    }),
  },
  "/v1/organizations/{organizationId}": {
    get: op("getOrganization", "Organization", {
      parameters: [pathId, tenantHeader],
    }),
    patch: op("updateOrganization", "Organization", {
      write: true,
      body: "UpdateOrganization",
      parameters: [pathId, tenantHeader],
    }),
  },
  "/v1/memberships": {
    get: op("listMemberships", "Memberships", {
      parameters: [
        { name: "organizationId", in: "query", required: true, schema: uuid },
        tenantHeader,
      ],
    }),
  },
  "/v1/organizations/{organizationId}/memberships": {
    post: op("createMembership", "Membership", {
      write: true,
      body: "CreateMembership",
      parameters: [pathId, tenantHeader],
      status: 201,
    }),
  },
  "/v1/organizations/{organizationId}/memberships/{membershipId}": {
    patch: op("updateMembership", "Membership", {
      write: true,
      body: "UpdateMembership",
      parameters: [pathId, membershipId, tenantHeader],
    }),
  },
};
const spec = {
  openapi: "3.0.3",
  info: {
    title: "Venda Flow AI — fundação candidata",
    version: "0.1.0",
    description:
      "Contrato novo da etapa 03. Compatibilidade com venda-openapi.yaml não demonstrada: referência ausente. Não inclui domínios comerciais nem API interna admin.",
  },
  paths,
  components: {
    securitySchemes: {
      session: { type: "apiKey", in: "cookie", name: "__Host-venda_session" },
    },
    schemas,
  },
};
fs.mkdirSync("contracts", { recursive: true });
fs.writeFileSync("contracts/foundation.openapi.yaml", YAML.stringify(spec));
console.log("Contrato candidato gerado antes da implementação.");
