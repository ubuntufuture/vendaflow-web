// Audit runner; all fixtures remain local and DEMO_ONLY.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
const root = process.cwd();
const out = path.join(root, "docs/auditoria/2026-11-23/evidencias");
fs.mkdirSync(out, { recursive: true });
const retest = process.argv.includes("--retest");
const results = retest
  ? JSON.parse(fs.readFileSync(path.join(out, "comandos.json"), "utf8")).results
  : [];
const iterationStart = results.length;
function safe(text) {
  return text
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/g, "postgresql://[REDACTED]@")
    .replace(/(__Host-venda_(?:session|oidc)=)[A-Za-z0-9_-]+/g, "$1[REDACTED]")
    .replace(/("csrfToken"\s*:\s*")[^"]+/g, "$1[REDACTED]");
}
async function run(name, args, cwd = root, extra = {}) {
  console.log(`INICIANDO: ${name}`);
  const start = Date.now();
  let output = "";
  const child = spawn(process.execPath, args, {
    cwd,
    windowsHide: true,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      ANALYZE: "false",
      VENDA_TEST_PG_PROCESS_TIMEOUT_MS: "240000",
      ...extra,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (d) => {
    output += d.toString();
  });
  child.stderr.on("data", (d) => {
    output += d.toString();
  });
  const code = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", resolve);
  });
  fs.writeFileSync(path.join(out, `${name}.log`), safe(output));
  results.push({
    name,
    command: [process.execPath, ...args],
    cwd,
    exitCode: code,
    durationMs: Date.now() - start,
    status: code === 0 ? "PASS" : "FAIL",
  });
  fs.writeFileSync(
    path.join(out, "comandos.json"),
    JSON.stringify({ executedAt: new Date().toISOString(), results }, null, 2) +
      "\n",
  );
  console.log(
    `${code === 0 ? "PASS" : "FAIL"}: ${name} (${((Date.now() - start) / 1000).toFixed(1)}s)`,
  );
  return code;
}
await run(retest ? "unitarios-web-final" : "unitarios-web", [
  "node_modules/vitest/vitest.mjs",
  "run",
  "--config",
  "venda-web/vitest.config.ts",
  "--reporter=json",
  `--outputFile=${path.join(out, "unitarios-web.json")}`,
]);
await run(retest ? "regressao-ui-final" : "regressao-ui", [
  "node_modules/vitest/vitest.mjs",
  "run",
  "--reporter=json",
  `--outputFile=${path.join(out, "regressao-ui.json")}`,
]);
if (!retest) {
  const backend = path.join(root, "venda-api");
  const old = new Map(
    fs
      .readdirSync(path.join(backend, "evidencias"))
      .map((f) => [f, fs.readFileSync(path.join(backend, "evidencias", f))]),
  );
  try {
    await run(
      "build-backend",
      ["node_modules/typescript/bin/tsc", "-p", "tsconfig.build.json"],
      backend,
    );
    await run(
      "compile-testes-backend",
      ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"],
      backend,
    );
    await run(
      "testes-backend",
      [
        "--test",
        "--test-concurrency=1",
        "--test-reporter=spec",
        "--test-reporter=junit",
        "--test-reporter-destination=stdout",
        `--test-reporter-destination=${path.join(out, "backend-resultados.xml")}`,
        "dist/test/config.test.js",
        "dist/test/foundation.test.js",
        "dist/test/telemetry.test.js",
      ],
      backend,
    );
    fs.mkdirSync(path.join(out, "backend"), { recursive: true });
    for (const f of ["integracao.json", "performance.json", "telemetria.json"])
      fs.copyFileSync(
        path.join(backend, "evidencias", f),
        path.join(out, "backend", f),
      );
  } finally {
    for (const [f, bytes] of old)
      fs.writeFileSync(path.join(backend, "evidencias", f), bytes);
  }
}
await run(retest ? "build-web-final" : "build-web", [
  "node_modules/next/dist/bin/next",
  "build",
  "venda-web",
  "--webpack",
]);
await run(
  retest ? "integracao-final" : "integracao-inicial",
  ["scripts/test-web-browser.mjs"],
  root,
  {
    VENDA_WEB_EVIDENCE_DIR: retest
      ? "docs/auditoria/2026-11-23/evidencias/integracao-final"
      : "docs/auditoria/2026-11-23/evidencias/integracao-inicial",
  },
);
console.log("Auditoria automática encerrada; veja comandos.json.");
process.exitCode = results
  .slice(iterationStart)
  .some((x) => x.status === "FAIL")
  ? 1
  : 0;
