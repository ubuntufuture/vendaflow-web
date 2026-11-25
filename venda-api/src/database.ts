import pg, { type PoolClient } from "pg";
import type { Config } from "./config.js";
import { trace, metrics, SpanStatusCode } from "@opentelemetry/api";
export interface TransactionTiming {
  workMs: number;
  commitMs: number;
}
export class Database {
  readonly pool: pg.Pool;
  private readonly duration = metrics
    .getMeter("venda-api")
    .createHistogram("db.transaction.duration", { unit: "ms" });
  constructor(
    config: Config,
    private readonly timing?: (value: TransactionTiming) => void,
  ) {
    this.pool = new pg.Pool({
      connectionString: config.databaseUrl,
      max: 10,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 10000,
      statement_timeout: 3000,
      lock_timeout: 1000,
      idle_in_transaction_session_timeout: 5000,
      ssl: config.dbTls ? { rejectUnauthorized: true, ca: config.dbCa } : false,
    });
    this.pool.on("error", () => {});
  }
  async tx<T>(
    context: {
      userId?: string;
      organizationId?: string;
      sessionHash?: string;
      flowHash?: string;
    },
    fn: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    if (this.pool.waitingCount > 100)
      throw Object.assign(new Error("DATABASE_BUSY"), {
        code: "DATABASE_BUSY",
      });
    const client = await this.pool.connect();
    const span = trace
      .getTracer("venda-api")
      .startSpan("db.transaction", {
        attributes: { "db.system.name": "postgresql" },
      });
    const start = performance.now();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT set_config('venda.user_id',$1,true),set_config('venda.organization_id',$2,true),set_config('venda.session_hash',$3,true),set_config('venda.flow_hash',$4,true)",
        [
          context.userId ?? "",
          context.organizationId ?? "",
          context.sessionHash ?? "",
          context.flowHash ?? "",
        ],
      );
      const result = await fn(client);
      const beforeCommit = performance.now();
      await client.query("COMMIT");
      this.timing?.({
        workMs: beforeCommit - start,
        commitMs: performance.now() - beforeCommit,
      });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      this.duration.record(performance.now() - start);
      span.end();
      client.release();
    }
  }
  async ready(): Promise<boolean> {
    try {
      return await this.tx({}, async (client) => {
        const role = await client.query<{ safe: boolean }>(
          "SELECT NOT rolsuper AND NOT rolbypassrls AND NOT pg_has_role(current_user,'venda_owner','MEMBER') AND NOT pg_has_role(current_user,'venda_authorizer','MEMBER') AND NOT pg_has_role(current_user,'venda_bootstrap','MEMBER') AND NOT pg_has_role(current_user,'venda_identity','MEMBER') AND NOT pg_has_role(current_user,'venda_worker','MEMBER') AND NOT pg_has_role(current_user,'venda_automation_executor','MEMBER') AS safe FROM pg_roles WHERE rolname=current_user",
        );
        const rls = await client.query<{ count: string; safe: boolean }>(
          "SELECT count(*)::text, bool_and(c.relrowsecurity AND c.relforcerowsecurity AND pg_get_userbyid(c.relowner)<>current_user) AS safe FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='venda' AND c.relkind='r'",
        );
        return (
          role.rows[0]?.safe === true &&
          rls.rows[0]?.safe === true &&
          Number(rls.rows[0].count) === 16
        );
      });
    } catch {
      return false;
    }
  }
  async close() {
    await this.pool.end();
  }
}
