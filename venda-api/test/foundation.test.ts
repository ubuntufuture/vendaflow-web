import "reflect-metadata";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import { Ajv } from "ajv";
import SwaggerParser from "@apidevtools/swagger-parser";
import { createApp } from "../src/app.js";
import { loadConfig, type Config } from "../src/config.js";
import { Database, type TransactionTiming } from "../src/database.js";
import { receiveOnce, recordChange } from "../src/events.js";
import { migrate } from "../src/migrate.js";
import { postgresFixture, freePort } from "./postgres.js";
import { idpFixture } from "./idp.js";

process.env.NODE_ENV = "test";
interface User {
  cookie: string;
  csrf: string;
  userId: string;
}
interface Org {
  id: string;
  name: string;
  timezone: string;
  locale: string;
  currency: string;
  createdAt: string;
}
interface Member {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  active: boolean;
}
interface Me {
  user: { id: string };
  csrfToken: string;
  sessionExpiresAt: string;
}
interface ErrorResponse {
  error: { code: string; message: string; requestId: string };
}
let postgres: Awaited<ReturnType<typeof postgresFixture>>,
  idp: Awaited<ReturnType<typeof idpFixture>>,
  runtime: Awaited<ReturnType<typeof createApp>>,
  config: Config,
  base: string;
let ownerA: User,
  ownerB: User,
  viewer: User,
  admin: User,
  agent: User,
  manager: User,
  billing: User,
  orgA: Org,
  orgB: Org;
const logs: string[] = [];
const outcomes: { name: string; status: string; detail?: unknown }[] = [];
const timings: TransactionTiming[] = [];
const evidence = "evidencias";
fs.mkdirSync(evidence, { recursive: true });
async function api<T = Record<string, unknown>>(
  path: string,
  user?: User,
  method = "GET",
  body?: unknown,
  extra: Record<string, string> = {},
) {
  const response = await fetch(base + path, {
    method,
    redirect: "manual",
    headers: {
      ...(user ? { Cookie: user.cookie } : {}),
      ...(method !== "GET"
        ? {
            "Content-Type": "application/json",
            Origin: config.appOrigin,
            ...(user ? { "X-CSRF-Token": user.csrf } : {}),
            "Idempotency-Key": randomUUID(),
          }
        : {}),
      ...extra,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    body: (text ? JSON.parse(text) : undefined) as T,
  };
}
async function flow(subject: string, mode = "valid") {
  idp.select(subject, mode);
  const begin = await fetch(base + "/v1/auth/login", { redirect: "manual" });
  assert.equal(begin.status, 302);
  const flowHeader = begin.headers
    .getSetCookie()
    .find((c) => c.startsWith("__Host-venda_oidc="))!;
  assert.match(flowHeader, /HttpOnly/);
  assert.match(flowHeader, /Secure/);
  assert.match(flowHeader, /SameSite=Lax/i);
  assert(!/Domain=/i.test(flowHeader));
  const auth = await fetch(begin.headers.get("location")!, {
    redirect: "manual",
  });
  assert.equal(auth.status, 302);
  return {
    location: auth.headers.get("location")!,
    cookie: flowHeader.split(";")[0]!,
  };
}
async function login(subject: string) {
  const f = await flow(subject);
  const response = await fetch(f.location, {
    redirect: "manual",
    headers: { Cookie: f.cookie },
  });
  assert.equal(response.status, 302, await response.clone().text());
  const cookieHeader = response.headers
    .getSetCookie()
    .find((c) => c.startsWith("__Host-venda_session="))!;
  assert.match(cookieHeader, /HttpOnly/);
  assert.match(cookieHeader, /Secure/);
  assert.match(cookieHeader, /SameSite=Lax/i);
  assert(!/Domain=/i.test(cookieHeader));
  const cookie = cookieHeader.split(";")[0]!;
  const me = await api<Me>("/v1/me", { cookie, csrf: "", userId: "" });
  assert.equal(me.status, 200);
  return { cookie, csrf: me.body.csrfToken, userId: me.body.user.id };
}
async function add(user: User, role: string) {
  const result = await api<Member>(
    `/v1/organizations/${orgA.id}/memberships`,
    ownerA,
    "POST",
    { userId: user.userId, role },
  );
  assert.equal(result.status, 201, JSON.stringify(result.body));
  return result.body;
}
function test(name: string, fn: () => Promise<void>) {
  it(name, async () => {
    try {
      await fn();
      outcomes.push({ name, status: "PASS" });
    } catch (error) {
      outcomes.push({
        name,
        status: "FAIL",
        detail: error instanceof Error ? error.message : "Falha",
      });
      throw error;
    }
  });
}

describe("DEMO_ONLY — fundação com PostgreSQL real e protocolo OIDC assinado", () => {
  before(async () => {
    postgres = await postgresFixture();
    idp = await idpFixture();
    const port = await freePort();
    base = `http://127.0.0.1:${port}`;
    config = loadConfig({
      NODE_ENV: "test",
      PORT: String(port),
      DATABASE_URL: postgres.databaseUrl,
      API_ORIGIN: base,
      APP_ORIGIN: base,
      OIDC_ISSUER: idp.issuer,
      OIDC_CLIENT_ID: idp.clientId,
      OIDC_CLIENT_SECRET: idp.clientSecret,
      SESSION_HASH_KEY: randomBytes(32).toString("hex"),
      FLOW_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
      CSRF_KEY: randomBytes(32).toString("hex"),
    });
    runtime = await createApp(
      config,
      new Database(config, (value) => timings.push(value)),
      (line) => logs.push(line),
    );
    await runtime.app.listen(port, "127.0.0.1");
    ownerA = await login("DEMO_ONLY-owner-A");
    ownerB = await login("DEMO_ONLY-owner-B");
    viewer = await login("DEMO_ONLY-viewer");
    admin = await login("DEMO_ONLY-admin");
    agent = await login("DEMO_ONLY-agent");
    manager = await login("DEMO_ONLY-manager");
    billing = await login("DEMO_ONLY-billing");
    const a = await api<Org>("/v1/organizations", ownerA, "POST", {
      name: "DEMO_ONLY organização A",
      timezone: "America/Sao_Paulo",
    });
    assert.equal(a.status, 201, JSON.stringify(a.body));
    orgA = a.body;
    const b = await api<Org>("/v1/organizations", ownerB, "POST", {
      name: "DEMO_ONLY organização B",
      timezone: "America/Sao_Paulo",
    });
    assert.equal(b.status, 201, JSON.stringify(b.body));
    orgB = b.body;
    for (const [user, role] of [
      [viewer, "viewer"],
      [admin, "admin"],
      [agent, "agent"],
      [manager, "manager"],
      [billing, "billing"],
    ] as const)
      await add(user, role);
  });
  after(async () => {
    fs.writeFileSync(
      `${evidence}/integracao.json`,
      JSON.stringify(
        {
          executedAt: new Date().toISOString(),
          postgresVersion: postgres?.version,
          fixture:
            "DEMO_ONLY, cluster PostgreSQL dedicado e provedor OIDC local de protocolo, sem credencial produtiva",
          tests: outcomes,
          logRecords: logs.length,
          externalProviderSandboxExecuted: false,
        },
        null,
        2,
      ) + "\n",
    );
    await runtime?.close();
    await idp?.close();
    await postgres?.stop();
  });
  test("health/readiness e contrato são públicos, API interna não existe", async () => {
    assert.equal((await api("/health")).status, 200);
    assert.equal((await api("/ready")).status, 200);
    assert.equal((await api("/v1/openapi.json")).status, 200);
    assert.equal((await api("/v1/admin/users", ownerA)).status, 404);
    assert.equal((await api("/admin/organizations", admin)).status, 404);
  });
  test("sessão real opaca, cookie restrito e Cache-Control no-store", async () => {
    const me = await api<Me>("/v1/me", ownerA);
    assert.equal(me.status, 200);
    assert.equal(me.body.user.id, ownerA.userId);
    assert.equal(me.headers.get("cache-control"), "no-store");
    assert.equal((await api("/v1/me")).status, 401);
    assert.equal(
      (
        await api("/v1/me", undefined, "GET", undefined, {
          Authorization: "Bearer DEMO_ONLY-forged",
        })
      ).status,
      401,
    );
  });
  test("tenant A não lê B por path ou query; listagem contém somente A", async () => {
    assert.equal(
      (await api(`/v1/organizations/${orgB.id}`, ownerA)).status,
      404,
    );
    assert.equal(
      (await api(`/v1/memberships?organizationId=${orgB.id}`, ownerA)).status,
      404,
    );
    const list = await api<{ data: Org[] }>("/v1/organizations", ownerA);
    assert(list.body.data.some((o) => o.id === orgA.id));
    assert(!list.body.data.some((o) => o.id === orgB.id));
  });
  test("tenant A não escreve B nem muda o escopo por header/body/query", async () => {
    assert.equal(
      (
        await api(`/v1/organizations/${orgB.id}`, ownerA, "PATCH", {
          name: "DEMO_ONLY ataque",
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await api(`/v1/organizations/${orgA.id}`, ownerA, "PATCH", {
          name: "DEMO_ONLY",
          organizationId: orgB.id,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await api(`/v1/organizations/${orgA.id}`, ownerA, "PATCH", {
          name: "DEMO_ONLY",
          tenantId: orgB.id,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await api(`/v1/organizations/${orgA.id}`, ownerA, "GET", undefined, {
          "X-Organization-Id": orgB.id,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await api(`/v1/organizations/${orgA.id}`, ownerA, "GET", undefined, {
          "X-Tenant-Id": orgB.id,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await api(
          `/v1/organizations/${orgA.id}?organizationId=${orgB.id}`,
          ownerA,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await api("/v1/organizations", ownerA, "GET", undefined, {
          "X-Organization-Id": orgB.id,
        })
      ).status,
      400,
    );
    assert.equal(
      (await api<Org>(`/v1/organizations/${orgB.id}`, ownerB)).body.name,
      "DEMO_ONLY organização B",
    );
  });
  test("viewer recebe 403 em mutações de domínio, inclusive com role forjada", async () => {
    for (const user of [viewer, agent, manager, billing]) {
      assert.equal(
        (
          await api(
            `/v1/organizations/${orgA.id}`,
            user,
            "PATCH",
            { name: "DEMO_ONLY" },
            { "X-Role": "owner" },
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await api(`/v1/organizations/${orgA.id}/memberships`, user, "POST", {
            userId: ownerB.userId,
            role: "owner",
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await api("/v1/organizations", user, "POST", {
            name: "DEMO_ONLY",
            timezone: "America/Sao_Paulo",
          })
        ).status,
        403,
      );
    }
  });
  test("viewer vê apenas seu membership; owner/manager veem equipe permitida", async () => {
    const v = await api<{ data: Member[] }>(
      `/v1/memberships?organizationId=${orgA.id}`,
      viewer,
    );
    assert.equal(v.body.data.length, 1);
    assert.equal(v.body.data[0]!.userId, viewer.userId);
    assert(
      (
        await api<{ data: Member[] }>(
          `/v1/memberships?organizationId=${orgA.id}`,
          manager,
        )
      ).body.data.length >= 6,
    );
  });
  test("admin cliente não promove a owner/admin; IDs de objetos de B não atravessam A", async () => {
    assert.equal(
      (
        await api(`/v1/organizations/${orgA.id}/memberships`, admin, "POST", {
          userId: ownerB.userId,
          role: "owner",
        })
      ).status,
      403,
    );
    const b = await api<{ data: Member[] }>(
      `/v1/memberships?organizationId=${orgB.id}`,
      ownerB,
    );
    assert.equal(
      (
        await api(
          `/v1/organizations/${orgA.id}/memberships/${b.body.data[0]!.id}`,
          ownerA,
          "PATCH",
          { role: "viewer" },
        )
      ).status,
      404,
    );
  });
  test("CSRF exige token e Origin exatos; JSON e DTOs são estritos", async () => {
    assert.equal(
      (
        await api(
          `/v1/organizations/${orgA.id}`,
          ownerA,
          "PATCH",
          { name: "DEMO_ONLY" },
          { "X-CSRF-Token": "" },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await api(
          `/v1/organizations/${orgA.id}`,
          ownerA,
          "PATCH",
          { name: "DEMO_ONLY" },
          { Origin: "https://example.invalid" },
        )
      ).status,
      403,
    );
    for (const body of [
      { name: null },
      { name: "" },
      { name: " " },
      { timezone: "INVALID/ZONE" },
      { currency: "USD" },
      {},
      [],
    ])
      assert.equal(
        (await api(`/v1/organizations/${orgA.id}`, ownerA, "PATCH", body))
          .status,
        400,
      );
    assert.equal(
      (
        await api(
          `/v1/organizations/${orgA.id}`,
          ownerA,
          "PATCH",
          { name: "DEMO_ONLY" },
          { "Content-Type": "text/plain" },
        )
      ).status,
      415,
    );
    assert.equal(
      (
        await api(`/v1/organizations/${orgA.id}`, ownerA, "PATCH", {
          name: "x".repeat(20000),
        })
      ).status,
      413,
    );
  });
  test("idempotência concorrente gera um resultado e um único evento/auditoria", async () => {
    const key = randomUUID(),
      body = { name: "DEMO_ONLY idempotência", timezone: "America/Sao_Paulo" };
    const rows = await Promise.all(
      Array.from({ length: 6 }, () =>
        api<Org>("/v1/organizations", ownerA, "POST", body, {
          "Idempotency-Key": key,
        }),
      ),
    );
    assert(rows.every((r) => r.status === 201));
    assert.equal(new Set(rows.map((r) => r.body.id)).size, 1);
    const count = await postgres.control.query<{ count: string }>(
      "SELECT count(*) FROM venda.outbox WHERE organization_id=$1",
      [rows[0]!.body.id],
    );
    assert.equal(Number(count.rows[0]!.count), 1);
    assert.equal(
      (
        await api(
          "/v1/organizations",
          ownerA,
          "POST",
          { ...body, name: "DEMO_ONLY diferente" },
          { "Idempotency-Key": key },
        )
      ).status,
      409,
    );
  });
  test("último owner e identidade dos objetos são protegidos", async () => {
    const list = await api<{ data: Member[] }>(
      `/v1/memberships?organizationId=${orgB.id}`,
      ownerB,
    );
    const owner = list.body.data[0]!;
    assert.equal(
      (
        await api(
          `/v1/organizations/${orgB.id}/memberships/${owner.id}`,
          ownerB,
          "PATCH",
          { role: "viewer" },
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await api(`/v1/organizations/${orgB.id}`, ownerB, "PATCH", {
          id: orgA.id,
        })
      ).status,
      400,
    );
  });
  test("FORCE RLS, role sem bypass e defesa SQL direta contra tenant B", async () => {
    assert.equal(await runtime.db.ready(), true);
    await runtime.db.tx(
      { userId: ownerA.userId, organizationId: orgB.id },
      async (client) => {
        assert.equal(
          (
            await client.query(
              "SELECT * FROM venda.organizations WHERE id=$1",
              [orgB.id],
            )
          ).rowCount,
          0,
        );
        assert.equal(
          (
            await client.query(
              "SELECT * FROM venda.memberships WHERE organization_id=$1",
              [orgB.id],
            )
          ).rowCount,
          0,
        );
        assert.equal(
          (
            await client.query(
              "SELECT * FROM venda.outbox WHERE organization_id=$1",
              [orgB.id],
            )
          ).rowCount,
          0,
        );
        assert.equal(
          (
            await client.query(
              "UPDATE venda.organizations SET name=$2 WHERE id=$1",
              [orgB.id, "DEMO_ONLY ataque SQL"],
            )
          ).rowCount,
          0,
        );
      },
    );
    await assert.rejects(
      runtime.db.tx(
        { userId: ownerA.userId, organizationId: orgA.id },
        (client) =>
          client.query(
            "INSERT INTO venda.inbox(organization_id,source,event_id) VALUES($1,$2,$3)",
            [orgB.id, "DEMO_ONLY", "DEMO_ONLY-event"],
          ),
      ),
    );
    await runtime.db.tx(
      { userId: viewer.userId, organizationId: orgA.id },
      async (client) =>
        assert.equal(
          (
            await client.query(
              "UPDATE venda.organizations SET name=$2 WHERE id=$1",
              [orgA.id, "DEMO_ONLY viewer SQL"],
            )
          ).rowCount,
          0,
        ),
    );
    const role = await runtime.db.pool.query<{
      rolsuper: boolean;
      rolbypassrls: boolean;
      privileged: boolean;
    }>(
      "SELECT rolsuper,rolbypassrls,pg_has_role(current_user,'venda_authorizer','MEMBER') AS privileged FROM pg_roles WHERE rolname=current_user",
    );
    assert.equal(role.rows[0]!.rolsuper, false);
    assert.equal(role.rows[0]!.rolbypassrls, false);
    assert.equal(role.rows[0]!.privileged, false);
  });
  test("SET LOCAL não vaza para conexão reutilizada e auditoria é append-only", async () => {
    await runtime.db.tx(
      { userId: ownerA.userId, organizationId: orgA.id },
      async (client) =>
        assert.equal(
          (
            await client.query(
              "SELECT current_setting('venda.organization_id') AS value",
            )
          ).rows[0].value,
          orgA.id,
        ),
    );
    const settings = await runtime.db.pool.query(
      "SELECT current_setting('venda.organization_id',true) AS value",
    );
    assert(!settings.rows[0].value);
    await assert.rejects(
      runtime.db.tx(
        { userId: ownerA.userId, organizationId: orgA.id },
        (client) => client.query("DELETE FROM venda.audit"),
      ),
    );
    await assert.rejects(
      postgres.control.query("UPDATE venda.audit SET action=$1", [
        "organization.updated",
      ]),
    );
  });
  test("outbox e auditoria são atômicos; inbox deduplica e rollback permite retry", async () => {
    const requestId = randomUUID();
    await assert.rejects(
      runtime.db.tx(
        { userId: ownerA.userId, organizationId: orgA.id },
        async (client) => {
          await recordChange(
            client,
            orgA.id,
            ownerA.userId,
            "organization.updated",
            orgA.id,
            requestId,
          );
          throw new Error("DEMO_ONLY rollback");
        },
      ),
    );
    assert.equal(
      (
        await postgres.control.query(
          "SELECT 1 FROM venda.outbox WHERE request_id=$1",
          [requestId],
        )
      ).rowCount,
      0,
    );
    assert.equal(
      (
        await postgres.control.query(
          "SELECT 1 FROM venda.audit WHERE request_id=$1",
          [requestId],
        )
      ).rowCount,
      0,
    );
    let count = 0;
    const execute = () =>
      runtime.db.tx(
        { userId: ownerA.userId, organizationId: orgA.id },
        (client) =>
          receiveOnce(
            client,
            orgA.id,
            "DEMO_ONLY",
            "DEMO_ONLY-dedupe",
            async () => {
              count++;
            },
          ),
      );
    assert.equal(await execute(), true);
    assert.equal(await execute(), false);
    assert.equal(count, 1);
    await assert.rejects(
      runtime.db.tx(
        { userId: ownerA.userId, organizationId: orgA.id },
        (client) =>
          receiveOnce(
            client,
            orgA.id,
            "DEMO_ONLY",
            "DEMO_ONLY-retry",
            async () => {
              throw new Error("DEMO_ONLY rollback");
            },
          ),
      ),
    );
    assert.equal(
      await runtime.db.tx(
        { userId: ownerA.userId, organizationId: orgA.id },
        (client) =>
          receiveOnce(
            client,
            orgA.id,
            "DEMO_ONLY",
            "DEMO_ONLY-retry",
            async () => {},
          ),
      ),
      true,
    );
  });
  test("OIDC rejeita state/replay e assinatura, nonce, issuer, audience e expiração inválidos", async () => {
    const f = await flow("DEMO_ONLY-state");
    const url = new URL(f.location);
    url.searchParams.set("state", "DEMO_ONLY-invalid");
    assert.equal(
      (await fetch(url, { redirect: "manual", headers: { Cookie: f.cookie } }))
        .status,
      401,
    );
    assert.equal(
      (
        await fetch(f.location, {
          redirect: "manual",
          headers: { Cookie: f.cookie },
        })
      ).status,
      401,
    );
    for (const mode of [
      "signature",
      "nonce",
      "issuer",
      "audience",
      "expired",
    ]) {
      const bad = await flow(`DEMO_ONLY-${mode}`, mode);
      const response = await fetch(bad.location, {
        redirect: "manual",
        headers: { Cookie: bad.cookie },
      });
      assert.equal(response.status, 401, `${mode}: ${await response.text()}`);
      assert(
        !response.headers
          .getSetCookie()
          .some((c) => c.startsWith("__Host-venda_session=")),
      );
    }
  });
  test("falha do IdP não derruba operações locais com sessão vigente", async () => {
    const f = await flow("DEMO_ONLY-outage");
    idp.setAvailable(false);
    try {
      const r = await fetch(f.location, {
        redirect: "manual",
        headers: { Cookie: f.cookie },
      });
      assert(r.status >= 400);
      assert.equal(
        (await api(`/v1/organizations/${orgA.id}`, ownerA)).status,
        200,
      );
    } finally {
      idp.setAvailable(true);
    }
  });
  test("logout e expiração revogam sessões; nova autenticação rotaciona o token", async () => {
    const user = await login("DEMO_ONLY-expiring");
    const next = await login("DEMO_ONLY-expiring");
    assert.notEqual(user.cookie, next.cookie);
    assert.equal((await api("/v1/auth/logout", user, "POST")).status, 204);
    assert.equal((await api("/v1/me", user)).status, 401);
    await postgres.control.query(
      "UPDATE venda.sessions SET expires_at=now()-interval '1 minute',created_at=now()-interval '2 minutes' WHERE user_id=$1",
      [next.userId],
    );
    assert.equal((await api("/v1/me", next)).status, 401);
    const idle = await login("DEMO_ONLY-idle");
    await postgres.control.query(
      "UPDATE venda.sessions SET last_seen_at=now()-interval '2 hours' WHERE user_id=$1",
      [idle.userId],
    );
    assert.equal((await api("/v1/me", idle)).status, 401);
  });
  test("revogação de membership vale no próximo uso; replay não contorna autorização", async () => {
    const list = await api<{ data: Member[] }>(
      `/v1/memberships?organizationId=${orgA.id}`,
      ownerA,
    );
    const row = list.body.data.find((m) => m.userId === viewer.userId)!;
    assert.equal(
      (
        await api(
          `/v1/organizations/${orgA.id}/memberships/${row.id}`,
          ownerA,
          "PATCH",
          { active: false },
        )
      ).status,
      200,
    );
    assert.equal(
      (await api(`/v1/organizations/${orgA.id}`, viewer)).status,
      404,
    );
    const former = await login("DEMO_ONLY-former-owner");
    const key = randomUUID();
    const payload = {
      name: "DEMO_ONLY replay revogado",
      timezone: "America/Sao_Paulo",
    };
    const created = await api<Org>(
      "/v1/organizations",
      former,
      "POST",
      payload,
      { "Idempotency-Key": key },
    );
    assert.equal(created.status, 201);
    assert.equal(
      (
        await api(
          `/v1/organizations/${created.body.id}/memberships`,
          former,
          "POST",
          { userId: ownerA.userId, role: "owner" },
        )
      ).status,
      201,
    );
    const team = await api<{ data: Member[] }>(
      `/v1/memberships?organizationId=${created.body.id}`,
      ownerA,
    );
    const formerMembership = team.body.data.find(
      (m) => m.userId === former.userId,
    )!;
    assert.equal(
      (
        await api(
          `/v1/organizations/${created.body.id}/memberships/${formerMembership.id}`,
          ownerA,
          "PATCH",
          { active: false },
        )
      ).status,
      200,
    );
    assert.equal(
      (await api(`/v1/organizations/${created.body.id}`, former)).status,
      404,
    );
    const replay = await api<ErrorResponse>(
      "/v1/organizations",
      former,
      "POST",
      payload,
      { "Idempotency-Key": key },
    );
    assert.equal(replay.status, 409);
    assert(!JSON.stringify(replay.body).includes(created.body.id));
    assert.equal(
      Number(
        (
          await postgres.control.query<{ count: string }>(
            "SELECT count(*) FROM venda.organizations WHERE created_by=$1",
            [former.userId],
          )
        ).rows[0]!.count,
      ),
      1,
    );
  });
  test("erro uniforme e logs não registram tokens, query, payload ou pessoa", async () => {
    const marker = "DEMO_ONLY_DADO_SENSIVEL";
    const result = await api<ErrorResponse>(
      `/v1/organizations/${orgA.id}?secret=${marker}`,
      ownerA,
    );
    assert.equal(result.status, 400);
    assert.match(result.body.error.requestId, /^[0-9a-f-]{36}$/);
    assert(!JSON.stringify(result.body).includes(marker));
    const all = logs.join("\n");
    assert(!all.includes(marker));
    assert(!all.includes(ownerA.cookie.split("=")[1]!));
    assert(!all.includes(ownerA.csrf));
    assert(!all.includes("DEMO_ONLY organização"));
    for (const line of logs) {
      const row = JSON.parse(line) as object;
      assert.deepEqual(
        Object.keys(row).sort(),
        [
          "durationMs",
          "method",
          "requestId",
          "route",
          "service",
          "status",
        ].sort(),
      );
    }
  });
  test("baseline local de GET/POST sem provedores externos", async () => {
    const observations: { method: string; ms: number; status: number }[] = [];
    timings.length = 0;
    for (const method of ["GET", "POST"])
      for (let batch = 0; batch < 10; batch++)
        await Promise.all(
          Array.from({ length: 5 }, async () => {
            const start = performance.now();
            const result = await api(
              method === "POST"
                ? "/v1/organizations"
                : `/v1/organizations/${orgA.id}`,
              ownerA,
              method,
              method === "POST"
                ? { name: "DEMO_ONLY benchmark", timezone: "America/Sao_Paulo" }
                : undefined,
            );
            observations.push({
              method,
              ms: performance.now() - start,
              status: result.status,
            });
          }),
        );
    const percentile = (v: number[], p: number) => {
      const a = [...v].sort((a, b) => a - b);
      return a[Math.ceil(a.length * p) - 1]!;
    };
    const summary = ["GET", "POST"].map((method) => {
      const rows = observations.filter((r) => r.method === method);
      return {
        method,
        count: rows.length,
        p75: percentile(
          rows.map((r) => r.ms),
          0.75,
        ),
        p95: percentile(
          rows.map((r) => r.ms),
          0.95,
        ),
        errors: rows.filter((r) => r.status !== (method === "POST" ? 201 : 200))
          .length,
      };
    });
    const dataset = (
      await postgres.control.query(
        "SELECT (SELECT count(*)::integer FROM venda.organizations) AS organizations,(SELECT count(*)::integer FROM venda.memberships) AS memberships",
      )
    ).rows[0];
    fs.writeFileSync(
      `${evidence}/performance.json`,
      JSON.stringify(
        {
          executedAt: new Date().toISOString(),
          host: {
            node: process.version,
            platform: process.platform,
            cpu: os.cpus()[0]?.model,
            memoryBytes: os.totalmem(),
          },
          profile: {
            location: "Windows local, loopback",
            dataset: { classification: "DEMO_ONLY", ...dataset },
            concurrency: 5,
            pool: 10,
            requests: 100,
            externalCalls: false,
            cache: "sem cache de resposta; sessões aquecidas",
            statistic:
              "nearest rank; amostra pequena, não representa carga produtiva acordada",
          },
          transactionTimings: timings,
          observations,
          summary,
        },
        null,
        2,
      ) + "\n",
    );
    assert(summary.every((r) => r.errors === 0));
  });
  test("respostas reais de identidade, organização, membership e erro satisfazem o OpenAPI", async () => {
    const spec = (await SwaggerParser.dereference(
      "contracts/foundation.openapi.yaml",
    )) as unknown as { components: { schemas: Record<string, object> } };
    const ajv = new Ajv({ strict: false, allErrors: true });
    ajv.addFormat("uuid", /^[0-9a-f-]{36}$/i);
    ajv.addFormat("date-time", {
      type: "string",
      validate: (v: string) =>
        /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v)),
    });
    for (const [schema, path, user] of [
      ["Me", "/v1/me", ownerA],
      ["Organization", `/v1/organizations/${orgA.id}`, ownerA],
      ["Memberships", `/v1/memberships?organizationId=${orgA.id}`, ownerA],
      ["Error", "/v1/me", undefined],
    ] as const) {
      const result = await api(path, user);
      const valid = ajv.compile(spec.components.schemas[schema]!);
      assert(valid(result.body), JSON.stringify(valid.errors));
    }
  });
  for (const [resource,body,field] of [
    ['contacts',{name:'DEMO_ONLY contato',phone:'+5511999990001',email:'demo@example.test'},'name'],
    ['opportunities',{title:'DEMO_ONLY proposta',stage:'proposal',amountCents:12345},'title'],
    ['tasks',{title:'DEMO_ONLY tarefa',dueAt:'2026-12-01T13:00:00Z'},'title'],
    ['knowledge',{title:'DEMO_ONLY conhecimento',content:'DEMO_ONLY conteúdo exclusivo de teste'},'title'],
    ['workflows',{name:'DEMO_ONLY fluxo',trigger:'opportunity.won',taskTitle:'DEMO_ONLY acompanhamento'},'name'],
  ] as const) test(`comercial ${resource}: criar, consultar, editar e arquivar no PostgreSQL real`,async()=>{
    // A suíte anterior exercitou revogação: restabelecer somente a fixture de leitura comercial.
    await postgres.control.query("UPDATE venda.memberships SET active=true,role='viewer' WHERE organization_id=$1 AND user_id=$2",[orgA.id,viewer.userId]);
    const route=`/v1/${resource}?organizationId=${orgA.id}`;
    const key=randomUUID();
    const created=await api<{id:string;version:number;archived:boolean}>(route,agent,'POST',body,{'Idempotency-Key':key});
    assert.equal(created.status,201,JSON.stringify(created.body));
    const replay=await api(route,agent,'POST',body,{'Idempotency-Key':key});
    assert.deepEqual(replay.body,created.body);
    const object=`/v1/${resource}/${created.body.id}?organizationId=${orgA.id}`;
    assert.equal((await api(object,viewer)).status,200);
    const patch={ [field]:'DEMO_ONLY alterado' };
    const updated=await api<{version:number}>(object,agent,'PATCH',patch,{'If-Match':'1'});
    assert.equal(updated.status,200,JSON.stringify(updated.body));
    assert.equal(updated.body.version,2);
    assert.equal((await api(object,agent,'PATCH',patch,{'If-Match':'1'})).status,409);
    const list=await api<{data:{id:string}[]}>(route,viewer);
    assert.equal(list.status,200); assert(list.body.data.some(r=>r.id===created.body.id));
    const archived=await api<{archived:boolean}>(`/v1/${resource}/${created.body.id}/archive?organizationId=${orgA.id}`,agent,'POST',{}, {'If-Match':'2'});
    assert.equal(archived.status,201,JSON.stringify(archived.body)); assert.equal(archived.body.archived,true);
    const db=await postgres.control.query(`SELECT archived,version FROM venda.${resource} WHERE id=$1`,[created.body.id]);
    assert.equal(db.rows[0].archived,true); assert.equal(db.rows[0].version,3);
    const events=await postgres.control.query('SELECT action FROM venda.audit WHERE entity_id=$1',[created.body.id]);
    assert.equal(events.rowCount,3);
    assert(!(await api<{data:{id:string}[]}>(route,viewer)).body.data.some(r=>r.id===created.body.id));
  });
  test('comercial: tenant A/B e viewer são bloqueados por path, query, body, header e RLS',async()=>{
    const a=await api<{id:string}>(`/v1/contacts?organizationId=${orgA.id}`,ownerA,'POST',{name:'DEMO_ONLY privado A'});
    assert.equal(a.status,201);
    const path=`/v1/contacts/${a.body.id}?organizationId=${orgA.id}`;
    assert.equal((await api(path,ownerB)).status,404);
    assert.equal((await api(`/v1/contacts/${a.body.id}?organizationId=${orgB.id}`,ownerB)).status,404);
    assert.equal((await api(path,viewer,'PATCH',{name:'DEMO_ONLY proibido'},{'If-Match':'1'})).status,403);
    assert.equal((await api(`/v1/contacts?organizationId=${orgA.id}`,billing)).status,403);
    assert.equal((await api(path,ownerA,'PATCH',{organizationId:orgB.id},{'If-Match':'1'})).status,400);
    assert.equal((await api(path,ownerA,'GET',undefined,{'X-Organization-Id':orgB.id})).status,400);
    assert.equal((await api(path,ownerA,'GET',undefined,{'X-Tenant-Id':orgB.id})).status,400);
    assert.equal((await api(`/v1/opportunities?organizationId=${orgB.id}`,ownerB,'POST',{title:'DEMO_ONLY referência cruzada',stage:'new',contactId:a.body.id})).status,404);
    const isolated=await runtime.db.tx({userId:ownerB.userId,organizationId:orgB.id},c=>c.query('SELECT id FROM venda.contacts WHERE id=$1',[a.body.id]));
    assert.equal(isolated.rowCount,0);
    await assert.rejects(runtime.db.tx({userId:viewer.userId,organizationId:orgA.id},c=>c.query("INSERT INTO venda.contacts(organization_id,name) VALUES($1,'DEMO_ONLY proibido')",[orgA.id])));
  });
  test('comercial: validação estrita, CSRF, idempotência e paginação sem dados falsos',async()=>{
    const route=`/v1/contacts?organizationId=${orgA.id}`;
    assert.equal((await api(route,ownerA,'POST',{name:'DEMO_ONLY',phone:'123'})).status,400);
    assert.equal((await api(route,ownerA,'POST',{name:'DEMO_ONLY',email:'invalido'})).status,400);
    assert.equal((await api(route,ownerA,'POST',{name:'DEMO_ONLY',mock:true})).status,400);
    assert.equal((await api(route,ownerA,'POST',{name:'DEMO_ONLY'},{'X-CSRF-Token':'invalido'})).status,403);
    assert.equal((await api(route+'&limit=101',ownerA)).status,400);
    const key=randomUUID();
    const results=await Promise.all([1,2].map(()=>api<{id:string}>(route,ownerA,'POST',{name:'DEMO_ONLY concorrente'},{'Idempotency-Key':key})));
    assert(results.every(r=>r.status===201)); assert.equal(results[0]!.body.id,results[1]!.body.id);
    assert.equal((await api(route,ownerA,'POST',{name:'DEMO_ONLY divergente'},{'Idempotency-Key':key})).status,409);
    assert.equal((await api(`/v1/contacts/${results[0]!.body.id}?organizationId=${orgA.id}`,ownerA,'PATCH',{}, {'If-Match':'1'})).status,400);
    const first=await api<{data:{id:string}[];nextCursor:string|null}>(route+'&limit=1',ownerA); assert.equal(first.body.data.length,1); assert(first.body.nextCursor);
    const second=await api<{data:{id:string}[]}>(route+'&limit=1&cursor='+first.body.nextCursor,ownerA); assert.notEqual(second.body.data[0]?.id,first.body.data[0]?.id);
    assert.equal((await api(route+'&q=%25',ownerA)).status,200);
  });
  test('comercial: métricas são agregadas no banco e propostas não viram receita',async()=>{
    await api(`/v1/opportunities?organizationId=${orgB.id}`,ownerB,'POST',{title:'DEMO_ONLY proposta B',stage:'proposal',amountCents:20000});
    await api(`/v1/opportunities?organizationId=${orgB.id}`,ownerB,'POST',{title:'DEMO_ONLY ganha B',stage:'won',amountCents:90000});
    const result=await api<{proposalAmountCents:number;confirmedRevenueCents:null;openOpportunities:number}>(`/v1/reports/overview?organizationId=${orgB.id}`,ownerB);
    assert.equal(result.status,200); assert.equal(result.body.proposalAmountCents,20000); assert.equal(result.body.confirmedRevenueCents,null); assert.equal(result.body.openOpportunities,1);
    assert.equal((await api(`/v1/reports/overview?organizationId=${orgB.id}`,ownerA)).status,404);
    assert(!logs.some(line=>line.includes('DEMO_ONLY privado A')||line.includes('demo@example.test')));
  });
  test('automação real: ativa, cria tarefa uma vez, registra recibo e pausa',async()=>{
    const created=await api<{id:string;version:number}>(`/v1/workflows?organizationId=${orgA.id}`,ownerA,'POST',{name:'DEMO_ONLY fluxo real',trigger:'opportunity.won',taskTitle:'DEMO_ONLY tarefa automática'});
    assert.equal(created.status,201,JSON.stringify(created.body));
    const action=`/v1/workflows/${created.body.id}`;
    assert.equal((await api(`${action}/activate?organizationId=${orgA.id}`,agent,'POST',{}, {'If-Match':'1'})).status,403);
    const activated=await api<{version:number;status:string}>(`${action}/activate?organizationId=${orgA.id}`,ownerA,'POST',{}, {'If-Match':'1'});
    assert.equal(activated.status,201,JSON.stringify(activated.body)); assert.equal(activated.body.status,'active');
    assert.equal((await api(`${action}?organizationId=${orgA.id}`,ownerA,'PATCH',{taskTitle:'DEMO_ONLY alteração ativa'},{'If-Match':String(activated.body.version)})).status,409);
    const won=await api<{id:string;version:number}>(`/v1/opportunities?organizationId=${orgA.id}`,ownerA,'POST',{title:'DEMO_ONLY ganhou',stage:'won'});
    assert.equal(won.status,201);
    await postgres.control.query('SELECT venda.execute_automation_batch(50)');
    const receipts=await api<{data:{taskId:string}[]}>(`${action}/executions?organizationId=${orgA.id}`,viewer);
    assert.equal(receipts.status,200); assert.equal(receipts.body.data.length,1);
    const task=await api<{title:string}>(`/v1/tasks/${receipts.body.data[0]!.taskId}?organizationId=${orgA.id}`,ownerA);
    assert.equal(task.status,200); assert.equal(task.body.title,'DEMO_ONLY tarefa automática');
    await api(`/v1/opportunities/${won.body.id}?organizationId=${orgA.id}`,ownerA,'PATCH',{title:'DEMO_ONLY apenas título'},{'If-Match':'1'});
    await postgres.control.query('SELECT venda.execute_automation_batch(50)');
    assert.equal((await api<{data:unknown[]}>(`${action}/executions?organizationId=${orgA.id}`,ownerA)).body.data.length,1);
    assert.equal((await api(`${action}/executions?organizationId=${orgA.id}`,ownerB)).status,404);
    const paused=await api(`${action}/pause?organizationId=${orgA.id}`,ownerA,'POST',{}, {'If-Match':String(activated.body.version)});
    assert.equal(paused.status,201);
    await api(`/v1/opportunities?organizationId=${orgA.id}`,ownerA,'POST',{title:'DEMO_ONLY após pausa',stage:'won'});
    await postgres.control.query('SELECT venda.execute_automation_batch(50)');
    assert.equal((await api<{data:unknown[]}>(`${action}/executions?organizationId=${orgA.id}`,ownerA)).body.data.length,1);
    await assert.rejects(runtime.db.pool.query('SELECT venda.execute_automation_batch(1)'),(error:unknown)=>(error as {code:string}).code==='42501');
  });
  test('automação: revogação interrompe execuções e tarefa gerada não cria loop',async()=>{
    const flow=await api<{id:string}>(`/v1/workflows?organizationId=${orgA.id}`,manager,'POST',{name:'DEMO_ONLY sem encadeamento',trigger:'task.created',taskTitle:'DEMO_ONLY tarefa gerada'});
    assert.equal((await api(`/v1/workflows/${flow.body.id}/activate?organizationId=${orgA.id}`,manager,'POST',{}, {'If-Match':'1'})).status,201);
    await api(`/v1/tasks?organizationId=${orgA.id}`,agent,'POST',{title:'DEMO_ONLY gatilho manual'});
    await postgres.control.query('SELECT venda.execute_automation_batch(50)');
    await postgres.control.query('SELECT venda.execute_automation_batch(50)');
    const path=`/v1/workflows/${flow.body.id}/executions?organizationId=${orgA.id}`;
    assert.equal((await api<{data:unknown[]}>(path,ownerA)).body.data.length,1);
    await postgres.control.query('UPDATE venda.memberships SET active=false WHERE organization_id=$1 AND user_id=$2',[orgA.id,manager.userId]);
    await api(`/v1/tasks?organizationId=${orgA.id}`,agent,'POST',{title:'DEMO_ONLY após revogação'});
    await postgres.control.query('SELECT venda.execute_automation_batch(50)');
    assert.equal((await api<{data:unknown[]}>(path,ownerA)).body.data.length,1);
    await postgres.control.query('UPDATE venda.memberships SET active=true WHERE organization_id=$1 AND user_id=$2',[orgA.id,manager.userId]);
  });
  test('callback aceita session_state opcional sem usá-lo como identidade ou autorização',async()=>{
    const next=await flow('DEMO_ONLY-session-state');
    const url=new URL(next.location);url.searchParams.set('session_state',randomUUID());
    const result=await fetch(url,{redirect:'manual',headers:{Cookie:next.cookie}});
    assert.equal(result.status,302);assert(result.headers.getSetCookie().some(c=>c.startsWith('__Host-venda_session=')));
  });
  test("migration é idempotente e readiness rejeita RLS removida", async () => {
    await migrate(postgres.adminUrl);
    await postgres.control.query(
      "ALTER TABLE venda.organizations NO FORCE ROW LEVEL SECURITY",
    );
    try {
      assert.equal((await api("/ready")).status, 503);
    } finally {
      await postgres.control.query(
        "ALTER TABLE venda.organizations FORCE ROW LEVEL SECURITY",
      );
    }
    assert.equal((await api("/ready")).status, 200);
  });
  test("down/up reconstrói o schema somente no cluster descartável de teste", async () => {
    await migrate(postgres.adminUrl, "down");
    assert.equal((await api("/ready")).status, 503);
    await migrate(postgres.adminUrl);
    assert.equal((await api("/ready")).status, 200);
  });
});
