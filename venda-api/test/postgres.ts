import fs from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import pg from "pg";
import { migrate } from "../src/migrate.js";
export async function freePort() {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("Porta indisponível");
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return addr.port;
}
export async function postgresFixture() {
  if (process.env.NODE_ENV !== "test")
    throw new Error("DEMO_ONLY: execução exige NODE_ENV=test.");
  const platform = process.platform === "win32" ? "windows" : process.platform;
  const { pg_ctl, initdb } = (await import(
    `@embedded-postgres/${platform}-${process.arch}`
  )) as { pg_ctl: string; initdb: string };
  const root = path.resolve(process.env.VENDA_TEST_RUNTIME_DIR ?? ".runtime"),
    directory = path.resolve(root, `DEMO_ONLY-${randomUUID()}`);
  if (!directory.startsWith(root + path.sep))
    throw new Error("Diretório fora do sandbox.");
  fs.mkdirSync(directory, { recursive: true });
  const pw = path.join(directory, "init-password");
  const password = randomBytes(32).toString("hex");
  fs.writeFileSync(pw, password, { mode: 0o600 });
  function run(binary: string, args: string[]) {
    const processTimeout = Number(
      process.env.VENDA_TEST_PG_PROCESS_TIMEOUT_MS ?? "60000",
    );
    if (
      !Number.isInteger(processTimeout) ||
      processTimeout < 60000 ||
      processTimeout > 240000
    )
      throw new Error("Timeout de fixture inválido.");
    const result = spawnSync(binary, args, {
      windowsHide: true,
      encoding: "utf8",
      stdio: "ignore",
      timeout: processTimeout,
    });
    if (result.status !== 0)
      throw new Error(
        `PostgreSQL falhou (${path.basename(binary)}), exit ${result.status ?? "timeout"}. Confira o log local de teste; credenciais não são registradas.`,
      );
  }
  const data = path.join(directory, "data"),
    port = await freePort();
  function cleanup() {
    if (process.env.KEEP_TEST_CLUSTER === "true") return;
    const resolvedRoot = fs.realpathSync(root);
    const resolvedTarget = fs.realpathSync(directory);
    if (
      !resolvedTarget.startsWith(resolvedRoot + path.sep) ||
      fs.lstatSync(directory).isSymbolicLink() ||
      fs.existsSync(path.join(data, "postmaster.pid"))
    )
      throw new Error(
        "Recusada limpeza de alvo fora do sandbox ou cluster ativo.",
      );
    fs.rmSync(resolvedTarget, {
      recursive: true,
      force: false,
      maxRetries: 3,
      retryDelay: 200,
    });
  }
  run(initdb, [
    "-D",
    data,
    "-U",
    "venda_test_admin",
    "-A",
    "scram-sha-256",
    "--pwfile",
    pw,
    "--encoding=UTF8",
    "--locale=C",
  ]);
  fs.unlinkSync(pw);
  run(pg_ctl, [
    "-D",
    data,
    "-l",
    path.join(directory, "postgres.log"),
    "-o",
    `-h 127.0.0.1 -p ${port} -c shared_buffers=32MB -c max_connections=40`,
    "-w",
    "-t", "240",
    "start",
  ]);
  const base = `postgresql://venda_test_admin:${password}@127.0.0.1:${port}/postgres`;
  const admin = new pg.Client({
    connectionString: base,
    // Cluster setup on a cold HDD can exceed the production runtime deadline.
    // This connection is the disposable fixture's control plane only.
    connectionTimeoutMillis: 30000,
  });
  try {
    await admin.connect();
    const dbName = `venda_test_${randomBytes(8).toString("hex")}`;
    await admin.query(`CREATE DATABASE ${dbName}`);
    const adminUrl = base.replace("/postgres", `/${dbName}`);
    await migrate(adminUrl);
    const runtimePassword = randomBytes(32).toString("hex");
    await admin.query(
      `CREATE ROLE venda_test_app LOGIN NOSUPERUSER NOBYPASSRLS INHERIT PASSWORD '${runtimePassword}'`,
    );
    await admin.query("GRANT venda_api TO venda_test_app");
    const databaseUrl = `postgresql://venda_test_app:${runtimePassword}@127.0.0.1:${port}/${dbName}`;
    const control = new pg.Client({ connectionString: adminUrl });
    await control.connect();
    return {
      databaseUrl,
      adminUrl,
      control,
      version: (await control.query<{ version: string }>("SELECT version()"))
        .rows[0]!.version,
      async stop() {
        await control.end();
        await admin.end();
        run(pg_ctl, ["-D", data, "-m", "fast", "-w", "-t", "240", "stop"]);
        cleanup();
      },
    };
  } catch (error) {
    await admin.end().catch(() => {});
    run(pg_ctl, ["-D", data, "-m", "fast", "-w", "-t", "240", "stop"]);
    cleanup();
    throw error;
  }
}
