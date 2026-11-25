import { loadConfig } from "./config.js";
import { startTelemetry } from "./telemetry.js";
const config = loadConfig();
const telemetry = startTelemetry(config);
const { createApp } = await import("./app.js");
const runtime = await createApp(config);
if (!(await runtime.db.ready())) {
  await runtime.close();
  throw new Error("Banco indisponível ou role/RLS inadequadas.");
}
await runtime.app.listen(
  config.port,
  config.nodeEnv === "test" || config.localDevelopment ? "127.0.0.1" : "0.0.0.0",
);
let closing: Promise<void> | undefined;
const shutdown = () =>
  (closing ??= (async () => {
    await runtime.close();
    await telemetry?.shutdown();
  })());
process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
