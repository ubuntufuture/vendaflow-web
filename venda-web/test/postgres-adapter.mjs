// DEMO_ONLY native PostgreSQL adapter: extra startup time for this Windows host.
// No application or API source depends on this module.
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { migrate } from "../../venda-api/dist/src/migrate.js";
const requireBackend = createRequire(
  new URL("../../venda-api/package.json", import.meta.url),
);
const pg = requireBackend("pg");
export async function postgresFixture() {
  if (process.env.NODE_ENV !== "test")
    throw new Error("DEMO_ONLY exige NODE_ENV=test.");
  const platform = process.platform === "win32" ? "windows" : process.platform;
  const binary = await import(
    pathToFileURL(
      requireBackend.resolve(`@embedded-postgres/${platform}-${process.arch}`),
    ).href
  );
  const root = path.resolve(
    process.env.VENDA_TEST_RUNTIME_DIR ?? fileURLToPath(new URL("../.runtime/", import.meta.url)),
  );
  const directory = path.join(root, `DEMO_ONLY-${randomUUID()}`);
  fs.mkdirSync(directory, { recursive: true });
  const data = path.join(directory, "data");
  const password = randomBytes(32).toString("hex");
  const passwordFile = path.join(directory, "init-password");
  fs.writeFileSync(passwordFile, password, { mode: 0o600 });
  let started = false,
    admin,
    control;
  const run = (exe, args) => {
    const result = spawnSync(exe, args, {
      windowsHide: true,
      stdio: "ignore",
      timeout: 240000,
    });
    if (result.status !== 0)
      throw new Error(
        `PostgreSQL nativo não iniciou/concluiu (${path.basename(exe)}); exit ${result.status ?? "timeout"}. Credenciais omitidas.`,
      );
  };
  function cleanup() {
    const target = fs.realpathSync(directory),
      resolvedRoot = fs.realpathSync(root);
    if (
      !target.startsWith(resolvedRoot + path.sep) ||
      fs.lstatSync(directory).isSymbolicLink() ||
      fs.existsSync(path.join(data, "postmaster.pid"))
    )
      throw new Error(
        "Limpeza recusada: diretório não seguro ou cluster ativo.",
      );
    fs.rmSync(directory, { recursive: true, maxRetries: 3 });
  }
  async function stop() {
    if (control) await control.end();
    if (admin) await admin.end();
    if (started) run(binary.pg_ctl, ["-D", data, "-m", "fast", "-w", "stop"]);
    cleanup();
  }
  try {
    console.log(
      "Inicializando PostgreSQL real DEMO_ONLY (timeout de inicialização 240s)…",
    );
    run(binary.initdb, [
      "-D",
      data,
      "-U",
      "venda_test_admin",
      "-A",
      "scram-sha-256",
      "--pwfile",
      passwordFile,
      "--encoding=UTF8",
      "--locale=C",
    ]);
    fs.unlinkSync(passwordFile);
    const { freePort } = await import("../../venda-api/dist/test/postgres.js");
    const port = await freePort();
    run(binary.pg_ctl, [
      "-D",
      data,
      "-l",
      path.join(directory, "postgres.log"),
      "-o",
      `-h 127.0.0.1 -p ${port}`,
      "-w",
      "start",
    ]);
    started = true;
    const base = `postgresql://venda_test_admin:${password}@127.0.0.1:${port}/postgres`;
    admin = new pg.Client({
      connectionString: base,
      connectionTimeoutMillis: 10000,
    });
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
    control = new pg.Client({ connectionString: adminUrl });
    await control.connect();
    console.log("PostgreSQL real pronto; iniciando integração HTTP/browser.");
    return {
      databaseUrl: `postgresql://venda_test_app:${runtimePassword}@127.0.0.1:${port}/${dbName}`,
      control,
      version: (await control.query("SELECT version()")).rows[0].version,
      stop,
    };
  } catch (error) {
    await stop();
    throw error;
  }
}
