import "reflect-metadata";
import pg from "pg";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
export async function migrate(url: string, direction: "up" | "down" = "up") {
  const target = new URL(url);
  if (!["postgres:", "postgresql:"].includes(target.protocol) || target.search)
    throw new Error(
      "URL de migration inválida; parâmetros de TLS na URL não são aceitos.",
    );
  if (
    direction === "down" &&
    (process.env.NODE_ENV !== "test" ||
      !["127.0.0.1", "localhost", "[::1]"].includes(target.hostname) ||
      !/^\/venda_test_[a-z0-9_]+$/.test(target.pathname))
  )
    throw new Error(
      "Rollback destrutivo permitido somente em banco local descartável venda_test_.",
    );
  const production = process.env.NODE_ENV === "production";
  if (production && !process.env.MIGRATION_CA_PEM)
    throw new Error("MIGRATION_CA_PEM obrigatório em produção.");
  if (
    production &&
    (!process.env.MIGRATION_EXPECTED_DATABASE ||
      decodeURIComponent(target.pathname.slice(1)) !==
        process.env.MIGRATION_EXPECTED_DATABASE)
  )
    throw new Error(
      "MIGRATION_EXPECTED_DATABASE deve confirmar o banco dedicado do Venda Flow AI.",
    );
  const client = new pg.Client({
    connectionString: url,
    ssl: production
      ? { rejectUnauthorized: true, ca: process.env.MIGRATION_CA_PEM! }
      : false,
  });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('venda.foundation.migrate',0))",
    );
    if (direction === "down") {
      if (process.env.NODE_ENV !== "test")
        throw new Error(
          "Rollback destrutivo permitido somente em banco descartável de teste.",
        );
      await client.query('DROP SCHEMA IF EXISTS venda_admin CASCADE');
      await client.query(
        fs.readFileSync("migrations/001_foundation.down.sql", "utf8"),
      );
      await client.query("DROP TABLE IF EXISTS public.venda_migrations");
    } else {
      await client.query(
        "CREATE TABLE IF NOT EXISTS public.venda_migrations(version integer PRIMARY KEY,checksum text NOT NULL)",
      );
      await client.query("REVOKE ALL ON public.venda_migrations FROM PUBLIC");
      const files = fs.readdirSync("migrations").filter(f => /^\d+_.+\.up\.sql$/.test(f)).sort();
      for (const file of files) {
      const version = Number(file.split("_")[0]);
      const sql = fs.readFileSync(`migrations/${file}`, "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const existing = await client.query<{ checksum: string }>(
        "SELECT checksum FROM public.venda_migrations WHERE version=$1", [version],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].checksum !== checksum)
          throw new Error("Checksum da migration diverge.");
      } else {
        await client.query(sql);
        await client.query(
          "INSERT INTO public.venda_migrations(version,checksum) VALUES($1,$2)",
          [version,checksum],
        );
      }
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url)
    throw new Error(
      "MIGRATION_DATABASE_URL pendente; nunca usar credencial runtime para migrations.",
    );
  await migrate(url, process.argv[2] === "down" ? "down" : "up");
  console.log("Migration concluída.");
}
