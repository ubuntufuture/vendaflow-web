import fs from "node:fs";
import YAML from "yaml";
import SwaggerParser from "@apidevtools/swagger-parser";
import {preservesFoundation} from './backward-compat.mjs';
const file = "contracts/venda.openapi.yaml";
const spec = YAML.parse(fs.readFileSync(file, "utf8"));
await SwaggerParser.validate(structuredClone(spec));
const foundation=YAML.parse(fs.readFileSync('contracts/foundation.openapi.yaml','utf8'));
const foundationPreserved=preservesFoundation(foundation,spec);
if(!foundationPreserved)throw new Error('Regressão do contrato da fundação.');
fs.mkdirSync("evidencias", { recursive: true });
const canonical = "../referencias/venda-openapi.yaml";
const report = {
  executedAt: new Date().toISOString(),
  openapi: spec.openapi,
  version: spec.info.version,
  valid: true,
  paths: Object.keys(spec.paths),
  canonicalContractAvailable: fs.existsSync(canonical),
  backwardCompatibilityProven: false,
  foundationBackwardCompatibilityProven: foundationPreserved,
  contractRole: 'initial_product_contract',
};
fs.writeFileSync(
  "evidencias/contrato.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  `PASS: OpenAPI ${spec.openapi} válido, ${report.paths.length} paths. Compatibilidade com referência ausente não demonstrada.`,
);
