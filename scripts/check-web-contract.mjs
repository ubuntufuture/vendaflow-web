import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID, createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const contract = "venda-api/contracts/venda.openapi.yaml";
const generated = "venda-web/lib/api.generated.ts";
const temporary = path.join(os.tmpdir(), `venda-contract-${randomUUID()}.ts`);
let passed = false;
try {
  const result = spawnSync(
    process.execPath,
    ["node_modules/openapi-typescript/bin/cli.js", contract, "-o", temporary],
    { stdio: "ignore", timeout: 60000, windowsHide: true },
  );
  passed =
    result.status === 0 &&
    fs.readFileSync(temporary, "utf8").replaceAll("\r\n", "\n") ===
      fs.readFileSync(generated, "utf8").replaceAll("\r\n", "\n");
} finally {
  if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
}
const sha = (file) =>
  createHash("sha256").update(fs.readFileSync(file)).digest("hex");
fs.writeFileSync(
  "docs/frontend/evidencias/contrato.json",
  JSON.stringify(
    {
      executedAt: new Date().toISOString(),
      passed,
      contract,
      contractSha256: sha(contract),
      generated,
      generatedSha256: sha(generated),
      regeneratedAndCompared: true,
      canonicalReferenceAvailable: false,
      canonicalCompatibilityProven: false,
      apiOrDatabaseChanged: false,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  passed
    ? "PASS: cliente regenerado é idêntico ao versionado."
    : "FAIL: cliente diverge do OpenAPI disponível.",
);
process.exitCode = passed ? 0 : 1;
