import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { loadConfig } from "../src/config.js";
import { authorize } from "../src/policy.js";
import { errorBody } from "../src/http.js";
import { migrate } from "../src/migrate.js";
const env = () => ({
  NODE_ENV: "test",
  DATABASE_URL: `postgresql://DEMO_ONLY:${randomBytes(16).toString("hex")}@127.0.0.1:1/venda_test_config`,
  API_ORIGIN: "http://127.0.0.1:1",
  APP_ORIGIN: "http://127.0.0.1:1",
  OIDC_ISSUER: "http://127.0.0.1:2",
  OIDC_CLIENT_ID: "DEMO_ONLY",
  OIDC_CLIENT_SECRET: randomBytes(32).toString("hex"),
  SESSION_HASH_KEY: randomBytes(32).toString("hex"),
  FLOW_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  CSRF_KEY: randomBytes(32).toString("hex"),
});
describe("Configuração e políticas sem serviços externos", () => {
  it("rollback recusa banco não descartável antes de abrir conexão", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";
    try {
      await assert.rejects(
        migrate(
          "postgresql://DEMO_ONLY:DEMO_ONLY@127.0.0.1:1/production",
          "down",
        ),
        /descartável/,
      );
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });
  it("exige variáveis e não revela seu conteúdo", () => {
    assert.throws(() => loadConfig({}), /NODE_ENV/);
    const e = env();
    assert.throws(() => loadConfig({ ...e, CSRF_KEY: e.SESSION_HASH_KEY }));
    assert.throws(() =>
      loadConfig({ ...e, DATABASE_URL: "DEMO_ONLY_INVALID" }),
    );
  });
  it("produção rejeita HTTP, DB sem TLS e segredos compartilhados", () => {
    const e = env();
    assert.throws(() => loadConfig({ ...e, NODE_ENV: "production" }));
    assert.throws(() =>
      loadConfig({
        ...e,
        NODE_ENV: "production",
        DB_TLS: "true",
        DB_CA_PEM: "DEMO_ONLY",
        API_ORIGIN: "https://127.0.0.1",
        APP_ORIGIN: "https://127.0.0.1",
      }),
    );
  });
  it("somente owner/admin têm capacidades de gestão da fundação", () => {
    for (const role of ["viewer", "agent", "manager", "billing"] as const)
      assert.throws(() => authorize(role, "organization.update"));
    for (const role of ["owner", "admin"] as const)
      assert.doesNotThrow(() => authorize(role, "membership.manage"));
  });
  it('desenvolvimento HTTP real é explícito, restrito a loopback e proibido em produção',()=>{
    const e=env();
    assert.throws(()=>loadConfig({...e,NODE_ENV:'development'}));
    assert.equal(loadConfig({...e,NODE_ENV:'development',VENDA_LOCAL_DEVELOPMENT:'true'}).localDevelopment,true);
    assert.throws(()=>loadConfig({...e,NODE_ENV:'development',VENDA_LOCAL_DEVELOPMENT:'true',OIDC_ISSUER:'http://externo.invalid'}));
    assert.throws(()=>loadConfig({...e,NODE_ENV:'production',VENDA_LOCAL_DEVELOPMENT:'true'}));
  });
  it("erro desconhecido nunca expõe stack, SQL ou segredo", () => {
    const error = Object.assign(new Error("DEMO_ONLY segredo"), {
      detail: "DEMO_ONLY SQL",
    });
    const result = errorBody(error, "DEMO_ONLY-request");
    assert.equal(result.status, 500);
    assert(!JSON.stringify(result).includes("segredo"));
    assert(!JSON.stringify(result).includes("SQL"));
  });
});
