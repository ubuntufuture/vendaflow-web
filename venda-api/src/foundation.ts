import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { digest } from "./config.js";
import { AuthService, type Principal } from "./auth.js";
import { authorize, membership, timezone, uuid, type Role } from "./policy.js";
import { recordChange } from "./events.js";
import type {
  CreateMembershipDto,
  CreateOrganizationDto,
  UpdateMembershipDto,
  UpdateOrganizationDto,
} from "./dto.js";

interface OrganizationRow {
  id: string;
  name: string;
  timezone: string;
  locale: "pt-BR";
  currency: "BRL";
  created_at: Date;
}
interface MembershipRow {
  id: string;
  organization_id: string;
  user_id: string;
  role: Role;
  active: boolean;
  created_at: Date;
}
const organization = (r: OrganizationRow) => ({
  id: r.id,
  name: r.name,
  timezone: r.timezone,
  locale: r.locale,
  currency: r.currency,
  createdAt: r.created_at.toISOString(),
});
const member = (r: MembershipRow) => ({
  id: r.id,
  organizationId: r.organization_id,
  userId: r.user_id,
  role: r.role,
  active: r.active,
  createdAt: r.created_at.toISOString(),
});
export class FoundationService {
  constructor(private readonly auth: AuthService) {}
  private async actorTx<T>(
    actor: Principal,
    fn: (client: PoolClient) => Promise<T>,
    organizationId?: string,
  ): Promise<T> {
    return this.auth.db.tx(
      {
        userId: actor.userId,
        sessionHash: actor.sessionHash,
        ...(organizationId ? { organizationId } : {}),
      },
      async (client) => {
        await this.auth.activeInTransaction(client, actor);
        return fn(client);
      },
    );
  }
  private async tenantTx<T>(
    actor: Principal,
    organizationId: string,
    fn: (client: PoolClient, role: Role) => Promise<T>,
    action?: "organization.update" | "membership.manage",
  ) {
    return this.actorTx(
      actor,
      async (client) => {
        const role = await membership(client, actor.userId, organizationId);
        if (action) authorize(role, action);
        return fn(client, role);
      },
      organizationId,
    );
  }
  private async once<T>(
    client: PoolClient,
    actor: Principal,
    scope: string,
    key: unknown,
    body: object,
    fn: () => Promise<T>,
    replay?: (value: T) => Promise<void>,
  ): Promise<T> {
    if (typeof key !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(key))
      throw new BadRequestException();
    const requestHash = digest(JSON.stringify(body, Object.keys(body).sort()));
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      `${actor.userId}:${scope}:${key}`,
    ]);
    const found = await client.query<{ request_hash: string; result: T }>(
      "SELECT request_hash,result FROM venda.idempotency WHERE actor_id=$1 AND scope=$2 AND key=$3",
      [actor.userId, scope, key],
    );
    if (found.rows[0]) {
      if (found.rows[0].request_hash !== requestHash)
        throw new ConflictException();
      await replay?.(found.rows[0].result);
      return found.rows[0].result;
    }
    const result = await fn();
    await client.query(
      "INSERT INTO venda.idempotency(actor_id,organization_id,scope,key,request_hash,result) VALUES($1,venda.tenant(),$2,$3,$4,$5)",
      [actor.userId, scope, key, requestHash, JSON.stringify(result)],
    );
    return result;
  }
  async organizations(actor: Principal) {
    return this.actorTx(actor, async (client) => {
      const result = await client.query<OrganizationRow>(
        "SELECT id,name,timezone,locale,currency,created_at FROM venda.organizations ORDER BY created_at,id LIMIT 100",
      );
      return { data: result.rows.map(organization) };
    });
  }
  async createOrganization(
    actor: Principal,
    body: CreateOrganizationDto,
    key: unknown,
    requestId: string,
  ) {
    timezone(body.timezone);
    return this.actorTx(actor, async (client) => {
      const permissions = await client.query<{ role: Role }>(
        "SELECT role FROM venda.memberships WHERE user_id=$1 AND active",
        [actor.userId],
      );
      if (
        permissions.rows.length &&
        !permissions.rows.some((r) => r.role === "owner" || r.role === "admin")
      )
        throw new ForbiddenException();
      return this.once(
        client,
        actor,
        "organization.create",
        key,
        body,
        async () => {
          const id = randomUUID();
          await client.query(
            "SELECT set_config('venda.organization_id',$1,true)",
            [id],
          );
          await client.query("SELECT venda.create_organization($1,$2,$3)", [
            id,
            body.name.trim(),
            body.timezone,
          ]);
          await recordChange(
            client,
            id,
            actor.userId,
            "organization.created",
            id,
            requestId,
          );
          const row = await client.query<OrganizationRow>(
            "SELECT * FROM venda.organizations WHERE id=$1",
            [id],
          );
          return organization(row.rows[0]!);
        },
        async (value) => {
          await membership(client, actor.userId, value.id);
        },
      );
    });
  }
  async getOrganization(actor: Principal, id: string) {
    return this.tenantTx(actor, id, async (client) => {
      const result = await client.query<OrganizationRow>(
        "SELECT * FROM venda.organizations WHERE id=$1",
        [id],
      );
      if (!result.rows[0]) throw new NotFoundException();
      return organization(result.rows[0]);
    });
  }
  async updateOrganization(
    actor: Principal,
    id: string,
    body: UpdateOrganizationDto,
    key: unknown,
    requestId: string,
  ) {
    if (Object.values(body).every((v) => v === undefined))
      throw new BadRequestException();
    if (body.timezone !== undefined) timezone(body.timezone);
    return this.tenantTx(
      actor,
      id,
      (client) =>
        this.once(
          client,
          actor,
          `organization.update:${id}`,
          key,
          body,
          async () => {
            const row = await client.query<OrganizationRow>(
              "UPDATE venda.organizations SET name=COALESCE($2,name),timezone=COALESCE($3,timezone) WHERE id=$1 RETURNING *",
              [id, body.name?.trim(), body.timezone],
            );
            if (!row.rows[0]) throw new NotFoundException();
            await recordChange(
              client,
              id,
              actor.userId,
              "organization.updated",
              id,
              requestId,
            );
            return organization(row.rows[0]);
          },
        ),
      "organization.update",
    );
  }
  async memberships(actor: Principal, id: string) {
    return this.tenantTx(actor, id, async (client, role) => {
      const result = await client.query<MembershipRow>(
        "SELECT * FROM venda.memberships WHERE organization_id=$1 AND ($2 OR user_id=$3) ORDER BY created_at,id LIMIT 100",
        [id, ["owner", "admin", "manager"].includes(role), actor.userId],
      );
      return { data: result.rows.map(member) };
    });
  }
  async createMembership(
    actor: Principal,
    id: string,
    body: CreateMembershipDto,
    key: unknown,
    requestId: string,
  ) {
    return this.tenantTx(
      actor,
      id,
      (client, role) => {
        if (role === "admin" && ["owner", "admin"].includes(body.role))
          throw new ForbiddenException();
        return this.once(
          client,
          actor,
          `membership.create:${id}`,
          key,
          body,
          async () => {
            const result = await client.query<MembershipRow>(
              "INSERT INTO venda.memberships(organization_id,user_id,role) VALUES($1,$2,$3) RETURNING *",
              [id, body.userId, body.role],
            );
            const created = member(result.rows[0]!);
            await recordChange(
              client,
              id,
              actor.userId,
              "membership.created",
              created.id,
              requestId,
            );
            return created;
          },
        );
      },
      "membership.manage",
    );
  }
  async updateMembership(
    actor: Principal,
    id: string,
    memberId: string,
    body: UpdateMembershipDto,
    key: unknown,
    requestId: string,
  ) {
    uuid(memberId);
    if (Object.values(body).every((v) => v === undefined))
      throw new BadRequestException();
    return this.tenantTx(
      actor,
      id,
      (client, role) =>
        this.once(
          client,
          actor,
          `membership.update:${id}:${memberId}`,
          key,
          body,
          async () => {
            const current = await client.query<MembershipRow>(
              "SELECT * FROM venda.memberships WHERE organization_id=$1 AND id=$2 FOR UPDATE",
              [id, memberId],
            );
            if (!current.rows[0]) throw new NotFoundException();
            if (
              role === "admin" &&
              [current.rows[0].role, body.role].some(
                (r) => r === "owner" || r === "admin",
              )
            )
              throw new ForbiddenException();
            const result = await client.query<MembershipRow>(
              "UPDATE venda.memberships SET role=COALESCE($3,role),active=COALESCE($4,active) WHERE organization_id=$1 AND id=$2 RETURNING *",
              [id, memberId, body.role, body.active],
            );
            if (!result.rows[0]) throw new NotFoundException();
            await recordChange(
              client,
              id,
              actor.userId,
              "membership.updated",
              memberId,
              requestId,
            );
            return member(result.rows[0]);
          },
        ),
      "membership.manage",
    );
  }
}
