import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const release = process.argv.includes("--release");
const checks = [];
const check = (name, fn) => {
  try {
    fn();
    checks.push({ name, status: "PASS" });
  } catch (error) {
    checks.push({ name, status: "FAIL", reason: error.message });
  }
};
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const integration = read("evidencias/integracao.json"),
  contract = read("evidencias/contrato.json"),
  performance = read("evidencias/performance.json");
check("PostgreSQL real identificado e 22 cenários de integração passam", () => {
  assert(integration.postgresVersion.startsWith("PostgreSQL "));
  assert.equal(integration.tests.length, 22);
  assert(integration.tests.every((t) => t.status === "PASS"));
});
check("JUnit tem 28 testes, sem falha, cancelamento ou skip", () => {
  const xml = fs.readFileSync("evidencias/resultados.xml", "utf8");
  assert.equal((xml.match(/<testcase\s/g) || []).length, 28);
  assert(!/<failure\b|<error\b|<skipped\b/.test(xml));
});
check("OpenAPI candidato válido", () => assert.equal(contract.valid, true));
check("GET p95 <=300ms e POST p95 <=500ms no perfil local", () => {
  assert.equal(performance.observations.length, 100);
  for (const row of performance.summary) {
    assert.equal(row.errors, 0);
    assert(row.p95 <= (row.method === "GET" ? 300 : 500), JSON.stringify(row));
  }
});
check("OpenTelemetry exporta trace e métrica ao collector de teste", () =>
  assert.equal(read("evidencias/telemetria.json").passed, true),
);
check("npm audit sem vulnerabilidades conhecidas", () =>
  assert.equal(
    read("evidencias/npm-audit.json").metadata.vulnerabilities.total,
    0,
  ),
);
check("TypeScript strict e build produtivo sem provedor DEMO_ONLY", () => {
  assert.equal(read("tsconfig.json").compilerOptions.strict, true);
  assert(fs.existsSync("build/main.js"));
  const files = fs.readdirSync("build");
  assert(!files.includes("test"));
  for (const f of files.filter((f) => f.endsWith(".js")))
    assert(
      !/DEMO_ONLY|test\/idp|test\/postgres/.test(
        fs.readFileSync(`build/${f}`, "utf8"),
      ),
      f,
    );
});
check(
  "Contrato visual e camadas anteriores não são dependências do backend",
  () => {
    const p = read("package.json");
    for (const name of Object.keys(p.dependencies))
      assert(!/next$|react|storybook|embedded-postgres|jose/.test(name), name);
  },
);
const mandatory = [
  "../referencias/00_ARQUITETURA_GERAL.md",
  "../referencias/03_SEGURANCA_E_GOVERNANCA.md",
  "../referencias/venda-openapi.yaml",
];
const missing = mandatory.filter((file) => !fs.existsSync(file));
if (release) {
  check("Arquitetura, segurança e contrato canônicos disponíveis", () =>
    assert.equal(missing.length, 0, missing.join(", ")),
  );
  check("Compatibilidade backward demonstrada contra contrato canônico", () =>
    assert.equal(contract.backwardCompatibilityProven, true),
  );
  check("Provedor OIDC externo validado em sandbox autorizado", () =>
    assert.equal(integration.externalProviderSandboxExecuted, true),
  );
  check("PRD V01–V24 reconciliado com a fundação", () =>
    assert.fail("PRD não fornecido; rastreabilidade ainda não comprovada."),
  );
}
const sources = [];
for (const dir of ["src", "migrations", "contracts", "test", "scripts"])
  for (const file of fs.readdirSync(dir)) {
    const p = `${dir}/${file}`;
    if (fs.statSync(p).isFile())
      sources.push({
        path: p,
        sha256: createHash("sha256").update(fs.readFileSync(p)).digest("hex"),
      });
  }
fs.writeFileSync(
  "evidencias/fontes-sha256.json",
  JSON.stringify(sources, null, 2) + "\n",
);
fs.writeFileSync(
  `evidencias/${release ? "gate-release" : "verificacao"}.json`,
  JSON.stringify(
    {
      executedAt: new Date().toISOString(),
      mode: release ? "release" : "candidato-local",
      checks,
      stageComplete: false,
      missingReferences: missing,
      externalProviderSandboxExecuted: false,
      productionDeployed: false,
    },
    null,
    2,
  ) + "\n",
);
for (const c of checks)
  console.log(`${c.status}: ${c.name}${c.reason ? ` — ${c.reason}` : ""}`);
process.exitCode = checks.some((c) => c.status === "FAIL") ? 1 : 0;
