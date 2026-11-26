import {OidcClient,type Flow} from "./oidc.js";
export {OidcClient} from "./oidc.js";
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import {
  Injectable,
  Inject,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
  ServiceUnavailableException,
  BadRequestException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { Request, Response } from "express";
import type { PoolClient } from "pg";
import type { Config } from "./config.js";
import { Database } from "./database.js";
import { membership, authorize, tenantSelector, type Role } from "./policy.js";

export interface Principal {
  userId: string;
  sessionHash: string;
  expiresAt: Date;
  csrfToken: string;
}
export interface ApiRequest extends Request {
  requestId: string;
  actor?: Principal;
}
export const Public = () => SetMetadata("venda.public", true);
export const Policy = (action: "organization.update" | "membership.manage") =>
  SetMetadata("venda.policy", action);
const secret = () => randomBytes(32).toString("base64url");
const equal = (a: string, b: string) => {
  const aa = Buffer.from(a),
    bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
};
const sessionCookie = "__Host-venda_session",
  flowCookie = "__Host-venda_oidc";
const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};
export class AuthService {
  constructor(
    readonly config: Config,
    readonly db: Database,
    readonly oidcClient: OidcClient,
  ) {}
  hash(value: string) {
    return createHmac("sha256", this.config.sessionKey)
      .update(value)
      .digest("hex");
  }
  csrf(value: string) {
    return createHmac("sha256", this.config.csrfKey)
      .update(value)
      .digest("base64url");
  }
  private encrypt(flow: Flow) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.config.flowKey, iv);
    const content = Buffer.concat([
      cipher.update(JSON.stringify(flow), "utf8"),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), content]).toString(
      "base64url",
    );
  }
  private decrypt(value: string): Flow {
    const bytes = Buffer.from(value, "base64url");
    const cipher = createDecipheriv(
      "aes-256-gcm",
      this.config.flowKey,
      bytes.subarray(0, 12),
    );
    cipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([
        cipher.update(bytes.subarray(28)),
        cipher.final(),
      ]).toString("utf8"),
    ) as Flow;
  }
  async begin(res: Response) {
    const { url, flow } = await this.oidcClient.begin();
    const handle = secret(),
      hash = this.hash(handle);
    await this.db.tx({ flowHash: hash }, (client) =>
      client.query(
        "INSERT INTO venda.auth_flows(flow_hash,encrypted_payload,expires_at) VALUES($1,$2,now()+interval '5 minutes')",
        [hash, this.encrypt(flow)],
      ),
    );
    res.cookie(flowCookie, handle, { ...cookieOptions, maxAge: 300000 });
    res.redirect(302, url);
  }
  async callback(req: ApiRequest, res: Response) {
    const handle = req.cookies?.[flowCookie] as unknown;
    if (typeof handle !== "string" || !/^[\w-]{43}$/.test(handle))
      throw new UnauthorizedException();
    const keys = ["code", "state", "iss", "session_state", "error", "error_description"];
    const query: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.query)) {
      if (
        !keys.includes(key) ||
        typeof value !== "string" ||
        value.length > 2048
      )
        throw new BadRequestException();
      query[key] = value;
    }
    const hash = this.hash(handle);
    const encrypted = await this.db.tx({ flowHash: hash }, async (client) => {
      const result = await client.query<{ encrypted_payload: string }>(
        "DELETE FROM venda.auth_flows WHERE flow_hash=$1 AND expires_at>now() RETURNING encrypted_payload",
        [hash],
      );
      return result.rows[0]?.encrypted_payload;
    });
    res.clearCookie(flowCookie, cookieOptions);
    if (!encrypted) throw new UnauthorizedException();
    const verified = await this.oidcClient.exchange(
      query,
      this.decrypt(encrypted),
    );
    const token = secret(),
      sessionHash = this.hash(token);
    await this.db.tx({ sessionHash }, async (client) => {
      const found = await client.query<{ id: string }>(
        "SELECT venda.resolve_identity($1,$2) AS id",
        [verified.issuer, verified.subject],
      );
      const userId = found.rows[0]!.id;
      await client.query("SELECT set_config('venda.user_id',$1,true)", [
        userId,
      ]);
      await client.query(
        "INSERT INTO venda.sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+make_interval(secs=>$3))",
        [sessionHash, userId, this.config.sessionSeconds],
      );
    });
    res.cookie(sessionCookie, token, {
      ...cookieOptions,
      maxAge: this.config.sessionSeconds * 1000,
    });
    res.redirect(302, this.config.appOrigin);
  }
  async authenticate(req: ApiRequest): Promise<Principal> {
    const token = req.cookies?.[sessionCookie] as unknown;
    if (typeof token !== "string" || !/^[\w-]{43}$/.test(token))
      throw new UnauthorizedException();
    const sessionHash = this.hash(token);
    return this.db.tx({ sessionHash }, async (client) => {
      const result = await client.query<{ user_id: string; expires_at: Date }>(
        "SELECT user_id,expires_at FROM venda.sessions WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>clock_timestamp() AND last_seen_at>clock_timestamp()-make_interval(secs=>$2)",
        [sessionHash, this.config.idleSeconds],
      );
      const session = result.rows[0];
      if (!session) throw new UnauthorizedException();
      await client.query("SELECT set_config('venda.user_id',$1,true)", [
        session.user_id,
      ]);
      await client.query(
        "UPDATE venda.sessions SET last_seen_at=clock_timestamp() WHERE token_hash=$1 AND revoked_at IS NULL AND last_seen_at<clock_timestamp()-make_interval(secs=>$2)",
        [sessionHash, Math.min(60, Math.floor(this.config.idleSeconds / 4))],
      );
      return {
        userId: session.user_id,
        sessionHash,
        expiresAt: session.expires_at,
        csrfToken: this.csrf(token),
      };
    });
  }
  verifyCsrf(req: ApiRequest) {
    if (
      req.get("origin") !== this.config.appOrigin ||
      !req.actor ||
      typeof req.headers["x-csrf-token"] !== "string" ||
      !equal(req.headers["x-csrf-token"], req.actor.csrfToken)
    )
      throw new ForbiddenException();
  }
  async activeInTransaction(client: PoolClient, actor: Principal) {
    const result = await client.query(
      "SELECT 1 FROM venda.sessions WHERE token_hash=$1 AND user_id=$2 AND revoked_at IS NULL AND expires_at>clock_timestamp() FOR SHARE",
      [actor.sessionHash, actor.userId],
    );
    if (result.rowCount !== 1) throw new UnauthorizedException();
  }
  async logout(req: ApiRequest, res: Response) {
    const actor = req.actor!;
    await this.db.tx(
      { userId: actor.userId, sessionHash: actor.sessionHash },
      (client) =>
        client.query(
          "UPDATE venda.sessions SET revoked_at=clock_timestamp() WHERE token_hash=$1",
          [actor.sessionHash],
        ),
    );
    res.clearCookie(sessionCookie, cookieOptions);
    res.status(204).send();
  }
}
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>("venda.public", [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const req = context.switchToHttp().getRequest<ApiRequest>();
    req.actor = await this.auth.authenticate(req);
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method))
      this.auth.verifyCsrf(req);
    return true;
  }
}
@Injectable()
export class TenantPolicyGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<ApiRequest>();
    const selected = req.params.organizationId ?? req.query.organizationId;
    if (typeof selected !== "string") throw new BadRequestException();
    tenantSelector(selected, req.headers);
    const actor = req.actor!;
    await this.auth.db.tx(
      {
        userId: actor.userId,
        organizationId: selected,
        sessionHash: actor.sessionHash,
      },
      async (client) => {
        await this.auth.activeInTransaction(client, actor);
        const role: Role = await membership(client, actor.userId, selected);
        const action = this.reflector.get<
          "organization.update" | "membership.manage"
        >("venda.policy", context.getHandler());
        if (action) authorize(role, action);
      },
    );
    return true;
  }
}
