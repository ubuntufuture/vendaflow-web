import { it } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import fs from "node:fs";
import { trace, metrics } from "@opentelemetry/api";
import { startTelemetry } from "../src/telemetry.js";
import type { Config } from "../src/config.js";
it("OpenTelemetry exporta trace e métrica para collector local sem dado pessoal", async () => {
  const received: { path: string; bytes: number }[] = [];
  const server = createServer(async (req, res) => {
    let size = 0;
    for await (const buffer of req) size += Buffer.byteLength(buffer);
    received.push({ path: req.url!, bytes: size });
    res.setHeader("Content-Type", "application/x-protobuf");
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Collector sem porta");
  assert.equal(startTelemetry({} as Config), undefined);
  const base = `http://127.0.0.1:${address.port}`;
  const sdk = startTelemetry({
    otlpEndpoint: `${base}/v1/traces`,
    otlpMetricsEndpoint: `${base}/v1/metrics`,
  } as Config)!;
  try {
    const span = trace
      .getTracer("DEMO_ONLY")
      .startSpan("DEMO_ONLY span", { attributes: { "http.route": "/v1/me" } });
    span.end();
    metrics
      .getMeter("DEMO_ONLY")
      .createHistogram("DEMO_ONLY.duration", { unit: "ms" })
      .record(1, { "http.route": "/v1/me" });
    await sdk.shutdown();
    assert(received.some((r) => r.path === "/v1/traces" && r.bytes > 0));
    assert(received.some((r) => r.path === "/v1/metrics" && r.bytes > 0));
    fs.mkdirSync("evidencias", { recursive: true });
    fs.writeFileSync(
      "evidencias/telemetria.json",
      JSON.stringify(
        {
          executedAt: new Date().toISOString(),
          scope: "DEMO_ONLY collector loopback, nenhum fornecedor externo",
          received,
          passed: true,
        },
        null,
        2,
      ) + "\n",
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
