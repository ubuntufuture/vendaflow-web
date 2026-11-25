import { createHash } from "node:crypto";
export interface Config {
  nodeEnv: "test" | "development" | "production";
  localDevelopment: boolean;
  port: number;
  databaseUrl: string;
  dbTls: boolean;
  dbCa?: string;
  apiOrigin: string;
  appOrigin: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  sessionKey: Buffer;
  flowKey: Buffer;
  csrfKey: Buffer;
  sessionSeconds: number;
  idleSeconds: number;
  oidcTimeout: number;
  otlpEndpoint?: string;
  otlpMetricsEndpoint?: string;
}
const fail = () => {
  throw new Error(
    "Configuração inválida: confira as variáveis obrigatórias em .env.example. Valores não são registrados.",
  );
};
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const required = (name: string) => {
    const value = env[name];
    if (!value)
      throw new Error(
        `Configuração pendente: ${name}. Nenhum valor foi registrado.`,
      );
    return value;
  };
  const nodeEnv = required("NODE_ENV");
  if (!["test", "development", "production"].includes(nodeEnv)) return fail();
  if (nodeEnv === 'production' && env.VENDA_LOCAL_DEVELOPMENT === 'true') return fail();
  const localDevelopment = nodeEnv === 'development' && env.VENDA_LOCAL_DEVELOPMENT === 'true';
  const url = (name: string, originOnly = false) => {
    const value = required(name);
    let u: URL;
    try {
      u = new URL(value);
    } catch {
      return fail();
    }
    if (u.username || u.password || u.hash || u.search) return fail();
    if (
      u.protocol !== "https:" &&
      !(
        (nodeEnv === "test" || localDevelopment) &&
        u.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(u.hostname)
      )
    )
      return fail();
    if (originOnly && u.pathname !== "/") return fail();
    return originOnly ? u.origin : value;
  };
  const key = (name: string) => {
    const value = required(name);
    if (!/^[a-f0-9]{64}$/i.test(value)) return fail();
    return Buffer.from(value, "hex");
  };
  const sessionKey = key("SESSION_HASH_KEY"),
    flowKey = key("FLOW_ENCRYPTION_KEY"),
    csrfKey = key("CSRF_KEY");
  if (
    new Set([
      sessionKey.toString("hex"),
      flowKey.toString("hex"),
      csrfKey.toString("hex"),
    ]).size !== 3
  )
    return fail();
  const databaseUrl = required("DATABASE_URL");
  let db: URL;
  try {
    db = new URL(databaseUrl);
  } catch {
    return fail();
  }
  if (
    !["postgres:", "postgresql:"].includes(db.protocol) ||
    !db.username ||
    !db.password ||
    db.search
  )
    return fail();
  const dbTls = env.DB_TLS === "true";
  if (nodeEnv === "production" && (!dbTls || !env.DB_CA_PEM)) return fail();
  const integer = (
    name: string,
    fallback: number,
    min: number,
    max: number,
  ) => {
    const n = Number(env[name] ?? fallback);
    if (!Number.isInteger(n) || n < min || n > max) return fail();
    return n;
  };
  const result: Config = {
    nodeEnv: nodeEnv as Config["nodeEnv"],
    localDevelopment,
    port: integer("PORT", 3201, 0, 65535),
    databaseUrl,
    dbTls,
    apiOrigin: url("API_ORIGIN", true),
    appOrigin: url("APP_ORIGIN", true),
    issuer: url("OIDC_ISSUER"),
    clientId: required("OIDC_CLIENT_ID"),
    clientSecret: required("OIDC_CLIENT_SECRET"),
    sessionKey,
    flowKey,
    csrfKey,
    sessionSeconds: integer("SESSION_SECONDS", 28800, 300, 28800),
    idleSeconds: integer("SESSION_IDLE_SECONDS", 1800, 60, 3600),
    oidcTimeout: integer("OIDC_TIMEOUT_SECONDS", 5, 1, 10),
  };
  if (env.DB_CA_PEM) result.dbCa = env.DB_CA_PEM;
  if (env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT)
    result.otlpEndpoint = url("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT");
  if (env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT)
    result.otlpMetricsEndpoint = url("OTEL_EXPORTER_OTLP_METRICS_ENDPOINT");
  return result;
}
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
