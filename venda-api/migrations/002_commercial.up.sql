-- Sem seeds. Cada tabela pertence exclusivamente à organização validada no servidor.
SET LOCAL ROLE venda_owner;
CREATE TABLE venda.contacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES venda.organizations(id),
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 120), phone text CHECK(phone ~ '^\+[1-9][0-9]{7,14}$'), email text CHECK(length(email)<=254),
 archived boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1 CHECK(version>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,id)
);
CREATE TABLE venda.opportunities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES venda.organizations(id), contact_id uuid,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 160), stage text NOT NULL CHECK(stage IN ('new','conversation','proposal','won','lost')),
 amount_cents bigint CHECK(amount_cents BETWEEN 0 AND 9000000000000), archived boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1 CHECK(version>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,id), FOREIGN KEY(organization_id,contact_id) REFERENCES venda.contacts(organization_id,id)
);
CREATE TABLE venda.tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES venda.organizations(id), contact_id uuid, opportunity_id uuid,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 160), due_at timestamptz, completed boolean NOT NULL DEFAULT false,
 archived boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1 CHECK(version>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,contact_id) REFERENCES venda.contacts(organization_id,id), FOREIGN KEY(organization_id,opportunity_id) REFERENCES venda.opportunities(organization_id,id)
);
CREATE TABLE venda.knowledge (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES venda.organizations(id), title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 160), content text NOT NULL CHECK(length(btrim(content)) BETWEEN 1 AND 12000),
 archived boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1 CHECK(version>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE venda.workflows (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES venda.organizations(id), name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 120),
 trigger text NOT NULL CHECK(trigger IN ('opportunity.won','task.created')), task_title text NOT NULL CHECK(length(btrim(task_title)) BETWEEN 1 AND 160),
 archived boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1 CHECK(version>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE venda.commerce_idempotency (
 organization_id uuid NOT NULL REFERENCES venda.organizations(id), actor_id uuid NOT NULL REFERENCES venda.users(id), scope text NOT NULL, key text NOT NULL CHECK(length(key) BETWEEN 16 AND 128),
 request_hash text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(organization_id,actor_id,scope,key)
);
CREATE FUNCTION venda.commerce_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.id<>OLD.id OR NEW.organization_id<>OLD.organization_id OR NEW.created_at<>OLD.created_at THEN RAISE EXCEPTION 'Immutable identifiers' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['contacts','opportunities','tasks','knowledge','workflows'] LOOP
  EXECUTE format('ALTER TABLE venda.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE venda.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE INDEX ON venda.%I(organization_id,id) WHERE NOT archived',t);
  EXECUTE format('CREATE POLICY read_tenant ON venda.%I FOR SELECT TO venda_api USING(organization_id=venda.tenant() AND venda.has_role(organization_id,ARRAY[''owner'',''admin'',''manager'',''agent'',''viewer'']))',t);
  EXECUTE format('CREATE POLICY insert_tenant ON venda.%I FOR INSERT TO venda_api WITH CHECK(organization_id=venda.tenant() AND venda.has_role(organization_id,ARRAY[''owner'',''admin'',''manager'',''agent'']))',t);
  EXECUTE format('CREATE POLICY update_tenant ON venda.%I FOR UPDATE TO venda_api USING(organization_id=venda.tenant() AND venda.has_role(organization_id,ARRAY[''owner'',''admin'',''manager'',''agent''])) WITH CHECK(organization_id=venda.tenant() AND venda.has_role(organization_id,ARRAY[''owner'',''admin'',''manager'',''agent'']))',t);
  EXECUTE format('CREATE TRIGGER immutable_identity BEFORE UPDATE ON venda.%I FOR EACH ROW EXECUTE FUNCTION venda.commerce_immutable()',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON venda.%I TO venda_api',t);
 END LOOP;
END $$;
ALTER TABLE venda.commerce_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE venda.commerce_idempotency FORCE ROW LEVEL SECURITY;
CREATE POLICY own_operation ON venda.commerce_idempotency TO venda_api USING(organization_id=venda.tenant() AND actor_id=venda.actor() AND venda.has_role(organization_id,ARRAY['owner','admin','manager','agent'])) WITH CHECK(organization_id=venda.tenant() AND actor_id=venda.actor() AND venda.has_role(organization_id,ARRAY['owner','admin','manager','agent']));
GRANT SELECT,INSERT ON venda.commerce_idempotency TO venda_api;
ALTER TABLE venda.audit DROP CONSTRAINT audit_action_check;
ALTER TABLE venda.audit ADD CONSTRAINT audit_action_check CHECK(action IN ('organization.created','organization.updated','membership.created','membership.updated') OR action ~ '^(contact|opportunity|task|knowledge|workflow)\.(created|updated|archived)$');
CREATE POLICY commerce_audit ON venda.audit FOR INSERT TO venda_api WITH CHECK(organization_id=venda.tenant() AND actor_id=venda.actor() AND action ~ '^(contact|opportunity|task|knowledge|workflow)\.(created|updated|archived)$' AND venda.has_role(organization_id,ARRAY['owner','admin','manager','agent']));
CREATE POLICY commerce_outbox ON venda.outbox FOR INSERT TO venda_api WITH CHECK(organization_id=venda.tenant() AND event_type ~ '^(contact|opportunity|task|knowledge|workflow)\.(created|updated|archived)$' AND venda.has_role(organization_id,ARRAY['owner','admin','manager','agent']));
RESET ROLE;
