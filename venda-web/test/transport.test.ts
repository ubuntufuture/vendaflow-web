import { createServer } from "node:http";
import { it, expect } from "vitest";
import { boundedFetch } from "../lib/transport";

it("DEMO_ONLY: deadline responde mesmo quando o fetch ignora abort", async () => {
  const never = (() => new Promise<Response>(() => {})) as typeof fetch;
  await expect(boundedFetch(new Request("http://127.0.0.1/"), 30, never)).rejects.toMatchObject({ status: 504 });
});
it("DEMO_ONLY: deadline inclui corpo HTTP interrompido após headers", async () => {
  const server = createServer((_req, res) => { res.writeHead(200, { "Content-Type": "application/json" }); res.write('{"fixture":"DEMO_ONLY'); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Porta indisponível");
  try { await expect(boundedFetch(new Request(`http://127.0.0.1:${address.port}`), 100)).rejects.toMatchObject({ status: 504 }); }
  finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
it("DEMO_ONLY: preserva JSON/correlation e recusa corpo acima do limite", async () => {
  const body = JSON.stringify({ fixture: "DEMO_ONLY" });
  const responder = (async () => new Response(body, { headers: { "X-Request-Id": "DEMO_ONLY", "Content-Type": "application/json" } })) as typeof fetch;
  const response = await boundedFetch(new Request("http://127.0.0.1/"), 1000, responder);
  expect(await response.json()).toEqual({ fixture: "DEMO_ONLY" });
  expect(response.headers.get("X-Request-Id")).toBe("DEMO_ONLY");
  await expect(boundedFetch(new Request("http://127.0.0.1/"), 1000, responder, 2)).rejects.toMatchObject({ status: 503 });
});
