-- Candidato da etapa 03. Executar com migrator dedicado, nunca com credencial runtime.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='venda_owner') THEN CREATE ROLE venda_owner NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='venda_api') THEN CREATE ROLE venda_api NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='venda_authorizer') THEN CREATE ROLE venda_authorizer NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='venda_bootstrap') THEN CREATE ROLE venda_bootstrap NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='venda_identity') THEN CREATE ROLE venda_identity NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('venda_owner','venda_api','venda_authorizer','venda_bootstrap','venda_identity') AND (rolsuper OR rolbypassrls OR rolcanlogin)) THEN RAISE EXCEPTION 'Unsafe foundation roles'; END IF;
END $$;
CREATE SCHEMA venda AUTHORIZATION venda_owner;
REVOKE ALL ON SCHEMA venda FROM PUBLIC;
GRANT USAGE ON SCHEMA venda TO venda_api,venda_authorizer,venda_bootstrap,venda_identity;
SET LOCAL ROLE venda_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA venda REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE FUNCTION venda.actor() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('venda.user_id',true),'')::uuid $$;
CREATE FUNCTION venda.tenant() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('venda.organization_id',true),'')::uuid $$;
CREATE TABLE venda.users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), issuer text NOT NULL, subject text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(issuer,subject), CHECK(length(subject) BETWEEN 1 AND 512)
);
CREATE TABLE venda.sessions (
 token_hash text PRIMARY KEY CHECK(length(token_hash)=64), user_id uuid NOT NULL REFERENCES venda.users(id),
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, last_seen_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz,
 CHECK(expires_at>created_at)
);
CREATE INDEX sessions_user ON venda.sessions(user_id);
CREATE TABLE venda.auth_flows (
 flow_hash text PRIMARY KEY CHECK(length(flow_hash)=64), encrypted_payload text NOT NULL,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE venda.organizations (
 id uuid PRIMARY KEY, name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120 AND btrim(name)<>''),
 timezone text NOT NULL CHECK(length(timezone) BETWEEN 1 AND 100), locale text NOT NULL DEFAULT 'pt-BR' CHECK(locale='pt-BR'),
 currency text NOT NULL DEFAULT 'BRL' CHECK(currency='BRL'), created_by uuid NOT NULL REFERENCES venda.users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE venda.memberships (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES venda.organizations(id), user_id uuid NOT NULL REFERENCES venda.users(id),
 role text NOT NULL CHECK(role IN ('owner','admin','manager','agent','viewer','billing')), active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,user_id)
);
CREATE INDEX memberships_actor ON venda.memberships(user_id,organization_id) WHERE active;
CREATE TABLE venda.idempotency (
 actor_id uuid NOT NULL REFERENCES venda.users(id), organization_id uuid NOT NULL REFERENCES venda.organizations(id), scope text NOT NULL, key text NOT NULL CHECK(length(key) BETWEEN 16 AND 128),
 request_hash text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(actor_id,scope,key)
);
CREATE TABLE venda.audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES venda.organizations(id), actor_id uuid NOT NULL REFERENCES venda.users(id),
 action text NOT NULL CHECK(action IN ('organization.created','organization.updated','membership.created','membership.updated')),
 entity_id uuid NOT NULL, request_id uuid NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE venda.outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES venda.organizations(id),
 event_type text NOT NULL, event_version integer NOT NULL DEFAULT 1 CHECK(event_version=1), entity_id uuid NOT NULL, request_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 10)
);
CREATE INDEX outbox_pending ON venda.outbox(created_at,id) WHERE published_at IS NULL;
CREATE TABLE venda.inbox (
 organization_id uuid NOT NULL REFERENCES venda.organizations(id), source text NOT NULL CHECK(length(source) BETWEEN 1 AND 64),
 event_id text NOT NULL CHECK(length(event_id) BETWEEN 1 AND 128), received_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(organization_id,source,event_id)
);
DO $$ DECLARE t text; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='venda' LOOP
  EXECUTE format('ALTER TABLE venda.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE venda.%I FORCE ROW LEVEL SECURITY',t);
 END LOOP;
END $$;
CREATE POLICY users_self ON venda.users FOR SELECT TO venda_api USING(id=venda.actor());
CREATE POLICY users_identity ON venda.users TO venda_identity USING(true) WITH CHECK(true);
CREATE POLICY sessions_bound ON venda.sessions TO venda_api USING(token_hash=nullif(current_setting('venda.session_hash',true),'')) WITH CHECK(token_hash=nullif(current_setting('venda.session_hash',true),'') AND user_id=venda.actor());
CREATE POLICY flows_bound ON venda.auth_flows TO venda_api USING(flow_hash=nullif(current_setting('venda.flow_hash',true),'')) WITH CHECK(flow_hash=nullif(current_setting('venda.flow_hash',true),''));
-- Leitura ampla SOMENTE por função booleana com role NOLOGIN/NOBYPASSRLS e sem membership concedido à API.
CREATE POLICY membership_authorizer ON venda.memberships FOR SELECT TO venda_authorizer USING(true);
CREATE FUNCTION venda.has_role(target uuid, roles text[] DEFAULT NULL) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,venda AS $$
 SELECT EXISTS(SELECT 1 FROM venda.memberships WHERE organization_id=target AND user_id=venda.actor() AND active AND (roles IS NULL OR role=ANY(roles)))
$$;
RESET ROLE;
ALTER FUNCTION venda.has_role(uuid,text[]) OWNER TO venda_authorizer;
GRANT SELECT ON venda.memberships TO venda_authorizer;
GRANT EXECUTE ON FUNCTION venda.actor(),venda.tenant() TO venda_api,venda_authorizer,venda_bootstrap;
GRANT EXECUTE ON FUNCTION venda.has_role(uuid,text[]) TO venda_api,venda_owner;
SET LOCAL ROLE venda_owner;
CREATE POLICY org_read ON venda.organizations FOR SELECT TO venda_api USING((venda.tenant() IS NULL OR id=venda.tenant()) AND venda.has_role(id));
CREATE POLICY org_update ON venda.organizations FOR UPDATE TO venda_api USING(id=venda.tenant() AND venda.has_role(id,ARRAY['owner','admin'])) WITH CHECK(id=venda.tenant() AND venda.has_role(id,ARRAY['owner','admin']));
CREATE POLICY members_read ON venda.memberships FOR SELECT TO venda_api USING(user_id=venda.actor() OR (organization_id=venda.tenant() AND venda.has_role(organization_id,ARRAY['owner','admin','manager'])));
CREATE POLICY members_insert ON venda.memberships FOR INSERT TO venda_api WITH CHECK(organization_id=venda.tenant() AND (venda.has_role(organization_id,ARRAY['owner']) OR (role NOT IN ('owner','admin') AND venda.has_role(organization_id,ARRAY['admin']))));
CREATE POLICY members_update ON venda.memberships FOR UPDATE TO venda_api USING(organization_id=venda.tenant() AND (venda.has_role(organization_id,ARRAY['owner']) OR (role NOT IN ('owner','admin') AND venda.has_role(organization_id,ARRAY['admin'])))) WITH CHECK(organization_id=venda.tenant() AND (venda.has_role(organization_id,ARRAY['owner']) OR (role NOT IN ('owner','admin') AND venda.has_role(organization_id,ARRAY['admin']))));
CREATE POLICY bootstrap_org ON venda.organizations FOR INSERT TO venda_bootstrap WITH CHECK(created_by=venda.actor() AND id=venda.tenant());
CREATE POLICY bootstrap_member ON venda.memberships FOR INSERT TO venda_bootstrap WITH CHECK(user_id=venda.actor() AND organization_id=venda.tenant() AND role='owner' AND active);
CREATE POLICY idem_actor ON venda.idempotency TO venda_api USING(actor_id=venda.actor() AND (venda.tenant() IS NULL OR organization_id=venda.tenant()) AND venda.has_role(organization_id,ARRAY['owner','admin'])) WITH CHECK(actor_id=venda.actor() AND organization_id=venda.tenant() AND venda.has_role(organization_id,ARRAY['owner','admin']));
CREATE POLICY audit_read ON venda.audit FOR SELECT TO venda_api USING(organization_id=venda.tenant() AND venda.has_role(organization_id,ARRAY['owner','admin']));
CREATE POLICY audit_insert ON venda.audit FOR INSERT TO venda_api WITH CHECK(organization_id=venda.tenant() AND actor_id=venda.actor() AND venda.has_role(organization_id,ARRAY['owner','admin']));
CREATE POLICY outbox_tenant ON venda.outbox TO venda_api USING(organization_id=venda.tenant() AND venda.has_role(organization_id,ARRAY['owner','admin'])) WITH CHECK(organization_id=venda.tenant() AND venda.has_role(organization_id,ARRAY['owner','admin']));
CREATE POLICY inbox_tenant ON venda.inbox TO venda_api USING(organization_id=venda.tenant() AND venda.has_role(organization_id,ARRAY['owner','admin'])) WITH CHECK(organization_id=venda.tenant() AND venda.has_role(organization_id,ARRAY['owner','admin']));
CREATE FUNCTION venda.create_organization(target uuid, org_name text, org_timezone text) RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,venda AS $$ BEGIN
 IF venda.actor() IS NULL OR venda.tenant() IS DISTINCT FROM target THEN RAISE EXCEPTION 'Invalid context' USING ERRCODE='42501'; END IF;
 IF org_timezone<>'UTC' AND org_timezone !~ '^[A-Za-z0-9_+-]+(/[A-Za-z0-9_+-]+)+$' THEN RAISE EXCEPTION 'Invalid timezone' USING ERRCODE='22023'; END IF;
 PERFORM pg_catalog.timezone(org_timezone,now());
 INSERT INTO venda.organizations(id,name,timezone,created_by) VALUES(target,org_name,org_timezone,venda.actor());
 INSERT INTO venda.memberships(organization_id,user_id,role) VALUES(target,venda.actor(),'owner');
END $$;
CREATE FUNCTION venda.resolve_identity(idp_issuer text, idp_subject text) RETURNS uuid
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,venda AS $$ DECLARE result uuid; BEGIN
 INSERT INTO venda.users(issuer,subject) VALUES(idp_issuer,idp_subject) ON CONFLICT(issuer,subject) DO UPDATE SET subject=EXCLUDED.subject RETURNING id INTO result;
 RETURN result;
END $$;
CREATE FUNCTION venda.protect_membership() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,venda AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('venda.membership.'||OLD.organization_id::text||':'||OLD.user_id::text,0));
 IF NEW.id<>OLD.id OR NEW.organization_id<>OLD.organization_id OR NEW.user_id<>OLD.user_id OR NEW.created_at<>OLD.created_at THEN RAISE EXCEPTION 'Immutable identifiers' USING ERRCODE='23514'; END IF;
 IF OLD.active AND OLD.role='owner' AND (NOT NEW.active OR NEW.role<>'owner') THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('venda.owner.'||OLD.organization_id::text,0));
  IF (SELECT count(*) FROM venda.memberships WHERE organization_id=OLD.organization_id AND active AND role='owner')<=1 THEN RAISE EXCEPTION 'Last owner' USING ERRCODE='23514'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER membership_immutable BEFORE UPDATE ON venda.memberships FOR EACH ROW EXECUTE FUNCTION venda.protect_membership();
CREATE FUNCTION venda.append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Append only' USING ERRCODE='42501'; END $$;
CREATE TRIGGER audit_append_only BEFORE UPDATE OR DELETE ON venda.audit FOR EACH ROW EXECUTE FUNCTION venda.append_only();
RESET ROLE;
ALTER FUNCTION venda.create_organization(uuid,text,text) OWNER TO venda_bootstrap;
ALTER FUNCTION venda.resolve_identity(text,text) OWNER TO venda_identity;
ALTER FUNCTION venda.protect_membership() OWNER TO venda_authorizer;
GRANT INSERT ON venda.organizations,venda.memberships TO venda_bootstrap;
GRANT SELECT,INSERT,UPDATE ON venda.users TO venda_identity;
GRANT EXECUTE ON FUNCTION venda.create_organization(uuid,text,text),venda.resolve_identity(text,text) TO venda_api;
GRANT SELECT ON venda.users,venda.organizations,venda.memberships,venda.audit,venda.outbox,venda.inbox TO venda_api;
GRANT SELECT,INSERT,UPDATE,DELETE ON venda.sessions,venda.auth_flows TO venda_api;
GRANT SELECT,INSERT ON venda.idempotency TO venda_api;
GRANT INSERT ON venda.memberships,venda.audit,venda.outbox,venda.inbox TO venda_api;
GRANT UPDATE(name,timezone) ON venda.organizations TO venda_api;
GRANT UPDATE(role,active) ON venda.memberships TO venda_api;
