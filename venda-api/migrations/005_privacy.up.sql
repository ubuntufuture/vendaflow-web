SET LOCAL ROLE venda_owner;
CREATE TABLE venda.consents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES venda.organizations(id), contact_id uuid NOT NULL,
 actor_id uuid NOT NULL REFERENCES venda.users(id), purpose text NOT NULL CHECK(purpose IN ('service','marketing')), channel text NOT NULL CHECK(channel IN ('whatsapp','email')),
 status text NOT NULL CHECK(status IN ('granted','revoked')), lawful_basis text NOT NULL CHECK(lawful_basis IN ('consent','contract','legal_obligation','legitimate_interest')),
 notice_version text NOT NULL CHECK(length(btrim(notice_version)) BETWEEN 1 AND 64), source_reference text NOT NULL CHECK(length(btrim(source_reference)) BETWEEN 1 AND 240),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), FOREIGN KEY(organization_id,contact_id) REFERENCES venda.contacts(organization_id,id),
 CHECK(purpose<>'marketing' OR status='revoked' OR lawful_basis='consent')
);
CREATE INDEX ON venda.consents(organization_id,contact_id,channel,purpose,recorded_at DESC,id DESC);
CREATE TABLE venda.privacy_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES venda.organizations(id), contact_id uuid NOT NULL,
 actor_id uuid NOT NULL REFERENCES venda.users(id), kind text NOT NULL CHECK(kind IN ('access','export','erasure')), status text NOT NULL DEFAULT 'pending_review' CHECK(status='pending_review'),
 source_reference text NOT NULL CHECK(length(btrim(source_reference)) BETWEEN 1 AND 240), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,contact_id) REFERENCES venda.contacts(organization_id,id)
);
CREATE TABLE venda.privacy_idempotency (
 organization_id uuid NOT NULL REFERENCES venda.organizations(id), actor_id uuid NOT NULL REFERENCES venda.users(id), key text NOT NULL CHECK(length(key) BETWEEN 16 AND 128),
 scope text NOT NULL CHECK(scope IN ('consent','request')), request_hash text NOT NULL, result jsonb NOT NULL, PRIMARY KEY(organization_id,actor_id,scope,key)
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['consents','privacy_requests','privacy_idempotency'] LOOP
  EXECUTE format('ALTER TABLE venda.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE venda.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY tenant_read ON venda.%I FOR SELECT TO venda_api USING(organization_id=venda.tenant() AND venda.has_role(organization_id,ARRAY[''owner'',''admin'',''manager'']))',t);
  EXECUTE format('CREATE POLICY tenant_insert ON venda.%I FOR INSERT TO venda_api WITH CHECK(organization_id=venda.tenant() AND actor_id=venda.actor() AND venda.has_role(organization_id,ARRAY[''owner'',''admin'',''manager'']))',t);
  EXECUTE format('GRANT SELECT,INSERT ON venda.%I TO venda_api',t);
 END LOOP;
END $$;
ALTER TABLE venda.audit DROP CONSTRAINT audit_action_check;
ALTER TABLE venda.audit ADD CONSTRAINT audit_action_check CHECK(action IN ('organization.created','organization.updated','membership.created','membership.updated','opportunity.won','task.automated','privacy.consent.recorded','privacy.request.created','privacy.export.read') OR action ~ '^(contact|opportunity|task|knowledge|workflow)\.(created|updated|archived)$' OR action ~ '^workflow\.(activated|paused|executed)$');
CREATE POLICY privacy_audit ON venda.audit FOR INSERT TO venda_api WITH CHECK(organization_id=venda.tenant() AND actor_id=venda.actor() AND action IN ('privacy.consent.recorded','privacy.request.created','privacy.export.read') AND venda.has_role(organization_id,ARRAY['owner','admin','manager']));
CREATE POLICY privacy_outbox ON venda.outbox FOR INSERT TO venda_api WITH CHECK(organization_id=venda.tenant() AND event_type IN ('privacy.consent.recorded','privacy.request.created','privacy.export.read') AND venda.has_role(organization_id,ARRAY['owner','admin','manager']));
RESET ROLE;
