import type { PoolClient } from "pg";
export type DomainAction =
  | "organization.created"
  | "organization.updated"
  | "membership.created"
  | "membership.updated"
  | "opportunity.won"
  | "privacy.consent.recorded" | "privacy.request.created" | "privacy.export.read"
  | `${"contact" | "opportunity" | "task" | "knowledge" | "workflow"}.${"created" | "updated" | "archived"}`;
export async function recordChange(
  client: PoolClient,
  organizationId: string,
  actorId: string,
  action: DomainAction,
  entityId: string,
  requestId: string,
) {
  await client.query(
    "INSERT INTO venda.audit(organization_id,actor_id,action,entity_id,request_id) VALUES($1,$2,$3,$4,$5)",
    [organizationId, actorId, action, entityId, requestId],
  );
  await client.query(
    "INSERT INTO venda.outbox(organization_id,event_type,entity_id,request_id) VALUES($1,$2,$3,$4)",
    [organizationId, action, entityId, requestId],
  );
}
export async function receiveOnce(
  client: PoolClient,
  organizationId: string,
  source: string,
  eventId: string,
  handler: () => Promise<void>,
): Promise<boolean> {
  const row = await client.query(
    "INSERT INTO venda.inbox(organization_id,source,event_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING event_id",
    [organizationId, source, eventId],
  );
  if (row.rowCount === 0) return false;
  await handler();
  return true;
}
// Ports de fases futuras. Sem gateway, credencial, preço ou entitlement inventado.
export interface SubscriptionStatePort {
  readonly provider: "mercado_pago";
  reconcile(organizationId: string): Promise<void>;
}
export interface ChannelAvailabilityPort {
  verifyOfficialChannel(organizationId: string): Promise<void>;
}
