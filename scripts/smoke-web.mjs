// DEMO_ONLY production-build smoke. No database or identity provider is simulated here.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createServer } from "node:http";
const results = [];
const base = "http://127.0.0.1:3402";
process.env.NODE_ENV = "production";
process.env.VENDA_WEB_LOCAL_TEST = "true";
process.env.VENDA_WEB_ORIGIN = base;
process.env.VENDA_API_INTERNAL_ORIGIN = "http://127.0.0.1:9";
delete process.env.ANALYZE;
const { default: next } = await import("next");
const app = next({
  dev: false,
  dir: path.resolve("venda-web"),
  hostname: "127.0.0.1",
  port: 3402,
});
let server;
function record(name, ok) {
  results.push({ name, status: ok ? "PASS" : "FAIL" });
}
try {
  await app.prepare();
  server = createServer(app.getRequestHandler());
  await new Promise((resolve) => server.listen(3402, "127.0.0.1", resolve));
  const home = await fetch(base);
  const html = await home.text();
  record(
    "build produtivo serve landing server-first",
    home.status === 200 && html.includes("Mais conversas."),
  );
  record(
    "sem cookie de identidade fabricado no público",
    !home.headers.has("set-cookie"),
  );
  record(
    "CSP produtivo usa nonce e não unsafe-eval",
    home.headers.get("content-security-policy")?.includes("'nonce-") &&
      !home.headers.get("content-security-policy").includes("unsafe-eval"),
  );
  const alias = await fetch(base + "/auth/callback?state=DEMO_ONLY", {
    redirect: "manual",
    headers: { Host: "invasor.invalid" },
  });
  record(
    "callback alias ignora Host injetado e usa origem configurada",
    alias.status === 302 &&
      alias.headers.get("location") ===
        base + "/v1/auth/callback?state=DEMO_ONLY",
  );
  record(
    "bridge não encaminha ação arbitrária",
    (await fetch(base + "/v1/auth/arbitrario")).status === 404,
  );
  record(
    "login não aceita destino arbitrário por query",
    (
      await fetch(base + "/v1/auth/login?returnTo=https://invasor.invalid", {
        redirect: "manual",
      })
    ).status === 400,
  );
  const unavailable = await fetch(base + "/app");
  record(
    "indisponibilidade privada segura sem cache",
    unavailable.headers.get("cache-control")?.includes("no-store") &&
      (await unavailable.text()).includes(
        "Serviço temporariamente indisponível",
      ),
  );
  record(
    "runtime sem ANALYZE não carrega bundle-analyzer",
    Object.keys(createRequire(import.meta.url).cache).every(
      (file) => !file.replaceAll("\\", "/").includes("/@next/bundle-analyzer/"),
    ),
  );
  const stalled = createServer(() => {});
  await new Promise((resolve) => stalled.listen(0, "127.0.0.1", resolve));
  const stalledAddress = stalled.address();
  try {
    process.env.VENDA_API_INTERNAL_ORIGIN = `http://127.0.0.1:${stalledAddress.port}`;
    const timed = await fetch(base + "/app", { signal: AbortSignal.timeout(20000) });
    record("deadline SSR real termina quando upstream não envia headers", (await timed.text()).includes("A confirmação demorou mais que o esperado"));
  } finally {
    stalled.closeAllConnections();
    await new Promise((resolve) => stalled.close(resolve));
  }
} catch (error) {
  results.push({ name: "smoke", status: "FAIL", detail: error.message });
} finally {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  await app.close();
}
fs.writeFileSync(
  "docs/frontend/evidencias/smoke.json",
  JSON.stringify({ executedAt: new Date().toISOString(), results }, null, 2) +
    "\n",
);
console.log(JSON.stringify(results, null, 2));
process.exitCode = results.some((r) => r.status === "FAIL") ? 1 : 0;
