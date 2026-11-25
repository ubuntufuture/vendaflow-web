import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import type { PoolClient } from "pg";
export const roles = [
  "owner",
  "admin",
  "manager",
  "agent",
  "viewer",
  "billing",
] as const;
export type Role = (typeof roles)[number];
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function uuid(value: unknown): string {
  if (typeof value !== "string" || !uuidPattern.test(value))
    throw new BadRequestException();
  return value;
}
export function authorize(
  role: Role,
  action: "organization.update" | "membership.manage",
) {
  if (!["owner", "admin"].includes(role)) throw new ForbiddenException();
}
export async function membership(
  client: PoolClient,
  userId: string,
  organizationId: string,
): Promise<Role> {
  await client.query(
    "SELECT pg_advisory_xact_lock_shared(hashtextextended($1,0))",
    [`venda.membership.${organizationId}:${userId}`],
  );
  const result = await client.query<{ role: Role }>(
    "SELECT role FROM venda.memberships WHERE organization_id=$1 AND user_id=$2 AND active",
    [organizationId, userId],
  );
  if (!result.rows[0]) throw new NotFoundException();
  return result.rows[0].role;
}
export function tenantSelector(
  organizationId: string,
  headers: Record<string, unknown>,
) {
  uuid(organizationId);
  if (headers["x-tenant-id"] !== undefined) throw new BadRequestException();
  const selected = headers["x-organization-id"];
  if (selected !== undefined && selected !== organizationId)
    throw new BadRequestException();
}
export function timezone(value: string) {
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: value });
  } catch {
    throw new BadRequestException();
  }
  if (!value.includes("/") && value !== "UTC") throw new BadRequestException();
}
