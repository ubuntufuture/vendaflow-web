DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='venda_admin_api') THEN CREATE ROLE venda_admin_api NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='venda_admin_authorizer') THEN CREATE ROLE venda_admin_authorizer NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='venda_admin_identity') THEN CREATE ROLE venda_admin_identity NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
END $$;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('venda_admin_api','venda_admin_authorizer','venda_admin_identity') AND (rolsuper OR rolbypassrls OR rolcanlogin)) THEN RAISE EXCEPTION 'Unsafe internal roles';END IF;END $$;
CREATE SCHEMA venda_admin AUTHORIZATION venda_owner;
GRANT USAGE ON SCHEMA venda_admin TO venda_admin_api,venda_admin_authorizer,venda_admin_identity,venda_api;
SET LOCAL ROLE venda_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA venda_admin REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE FUNCTION venda_admin.actor() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('venda_admin.user_id',true),'')::uuid $$;
CREATE TABLE venda_admin.users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),issuer text NOT NULL,subject text NOT NULL,role text NOT NULL CHECK(role IN ('platform_admin','billing_admin','support_viewer')),active boolean NOT NULL DEFAULT true,UNIQUE(issuer,subject));
CREATE TABLE venda_admin.sessions(token_hash text PRIMARY KEY CHECK(length(token_hash)=64),user_id uuid NOT NULL REFERENCES venda_admin.users(id),mfa_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,revoked_at timestamptz,CHECK(expires_at>mfa_at AND expires_at<=mfa_at+interval '15 minutes'));
CREATE TABLE venda_admin.flows(flow_hash text PRIMARY KEY,encrypted_payload text NOT NULL,expires_at timestamptz NOT NULL);
CREATE TABLE venda_admin.plan_versions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),code text NOT NULL CHECK(code ~ '^[a-z][a-z0-9_-]{1,47}$'),version integer NOT NULL CHECK(version>0),revision integer NOT NULL DEFAULT 1,
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 80),amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 9000000000000),currency text NOT NULL DEFAULT 'BRL' CHECK(currency='BRL'),
 frequency integer NOT NULL CHECK(frequency BETWEEN 1 AND 365),frequency_type text NOT NULL CHECK(frequency_type IN ('days','months')),features jsonb NOT NULL CHECK(jsonb_typeof(features)='array'),limits jsonb NOT NULL CHECK(jsonb_typeof(limits)='object'),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','retired')),created_by uuid NOT NULL REFERENCES venda_admin.users(id),created_at timestamptz NOT NULL DEFAULT now(),published_at timestamptz,UNIQUE(code,version)
);
CREATE UNIQUE INDEX one_published_plan_version ON venda_admin.plan_versions(code) WHERE status='published';
CREATE TABLE venda_admin.audit(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),actor_id uuid NOT NULL REFERENCES venda_admin.users(id),action text NOT NULL CHECK(action IN ('plan.created','plan.published','plan.retired')),entity_id uuid NOT NULL REFERENCES venda_admin.plan_versions(id),request_id uuid NOT NULL,occurred_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE venda_admin.idempotency(actor_id uuid NOT NULL REFERENCES venda_admin.users(id),scope text NOT NULL,key text NOT NULL,request_hash text NOT NULL,result jsonb NOT NULL,PRIMARY KEY(actor_id,scope,key));
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['users','sessions','flows','plan_versions','audit','idempotency'] LOOP EXECUTE format('ALTER TABLE venda_admin.%I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE venda_admin.%I FORCE ROW LEVEL SECURITY',t);END LOOP;END $$;
CREATE POLICY authorizer_users ON venda_admin.users FOR SELECT TO venda_admin_authorizer USING(true);
CREATE POLICY identity_users ON venda_admin.users TO venda_admin_identity USING(true) WITH CHECK(true);
CREATE POLICY authorizer_sessions ON venda_admin.sessions FOR SELECT TO venda_admin_authorizer USING(token_hash=nullif(current_setting('venda_admin.session_hash',true),''));
CREATE FUNCTION venda_admin.has_role(roles text[]) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,venda_admin AS $$ SELECT EXISTS(SELECT 1 FROM venda_admin.users u JOIN venda_admin.sessions s ON s.user_id=u.id WHERE u.id=venda_admin.actor() AND u.active AND u.role=ANY(roles) AND s.token_hash=nullif(current_setting('venda_admin.session_hash',true),'') AND s.expires_at>clock_timestamp() AND s.revoked_at IS NULL) $$;
CREATE POLICY own_user ON venda_admin.users FOR SELECT TO venda_admin_api USING(id=venda_admin.actor());
CREATE POLICY own_session ON venda_admin.sessions TO venda_admin_api USING(token_hash=nullif(current_setting('venda_admin.session_hash',true),'')) WITH CHECK(token_hash=nullif(current_setting('venda_admin.session_hash',true),'') AND user_id=venda_admin.actor());
CREATE POLICY own_flow ON venda_admin.flows TO venda_admin_api USING(flow_hash=nullif(current_setting('venda_admin.flow_hash',true),'')) WITH CHECK(flow_hash=nullif(current_setting('venda_admin.flow_hash',true),''));
CREATE POLICY internal_catalog_read ON venda_admin.plan_versions FOR SELECT TO venda_admin_api USING(venda_admin.has_role(ARRAY['platform_admin','billing_admin','support_viewer']));
CREATE POLICY public_catalog_read ON venda_admin.plan_versions FOR SELECT TO venda_api USING(status='published');
CREATE POLICY internal_catalog_insert ON venda_admin.plan_versions FOR INSERT TO venda_admin_api WITH CHECK(created_by=venda_admin.actor() AND venda_admin.has_role(ARRAY['platform_admin','billing_admin']));
CREATE POLICY internal_catalog_update ON venda_admin.plan_versions FOR UPDATE TO venda_admin_api USING(venda_admin.has_role(ARRAY['platform_admin','billing_admin'])) WITH CHECK(venda_admin.has_role(ARRAY['platform_admin','billing_admin']));
CREATE POLICY internal_audit_read ON venda_admin.audit FOR SELECT TO venda_admin_api USING(venda_admin.has_role(ARRAY['platform_admin','billing_admin','support_viewer']));
CREATE POLICY internal_audit_write ON venda_admin.audit FOR INSERT TO venda_admin_api WITH CHECK(actor_id=venda_admin.actor() AND venda_admin.has_role(ARRAY['platform_admin','billing_admin']));
CREATE POLICY own_idempotency ON venda_admin.idempotency TO venda_admin_api USING(actor_id=venda_admin.actor() AND venda_admin.has_role(ARRAY['platform_admin','billing_admin'])) WITH CHECK(actor_id=venda_admin.actor() AND venda_admin.has_role(ARRAY['platform_admin','billing_admin']));
CREATE FUNCTION venda_admin.resolve_identity(iss text,sub text,internal_role text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,venda_admin AS $$ DECLARE target uuid;BEGIN
 IF length(iss) NOT BETWEEN 1 AND 2048 OR length(sub) NOT BETWEEN 1 AND 512 OR internal_role NOT IN ('platform_admin','billing_admin','support_viewer') THEN RAISE EXCEPTION 'Invalid identity' USING ERRCODE='22023'; END IF;
 INSERT INTO venda_admin.users(issuer,subject,role) VALUES(iss,sub,internal_role) ON CONFLICT(issuer,subject) DO UPDATE SET role=excluded.role RETURNING id INTO target;RETURN target;
END $$;
CREATE FUNCTION venda_admin.protect_plan() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF ROW(NEW.id,NEW.code,NEW.version,NEW.name,NEW.amount_cents,NEW.currency,NEW.frequency,NEW.frequency_type,NEW.features,NEW.limits,NEW.created_by,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.code,OLD.version,OLD.name,OLD.amount_cents,OLD.currency,OLD.frequency,OLD.frequency_type,OLD.features,OLD.limits,OLD.created_by,OLD.created_at) THEN RAISE EXCEPTION 'Immutable plan; create another version' USING ERRCODE='23514';END IF;
 IF NOT((OLD.status='draft' AND NEW.status='published') OR (OLD.status='published' AND NEW.status='retired')) OR NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'Invalid plan transition' USING ERRCODE='23514';END IF;RETURN NEW;
END $$;
CREATE TRIGGER immutable_plan BEFORE UPDATE ON venda_admin.plan_versions FOR EACH ROW EXECUTE FUNCTION venda_admin.protect_plan();
CREATE TRIGGER admin_audit_append_only BEFORE UPDATE OR DELETE ON venda_admin.audit FOR EACH ROW EXECUTE FUNCTION venda.append_only();
GRANT EXECUTE ON FUNCTION venda_admin.actor() TO venda_admin_api,venda_admin_authorizer;
GRANT EXECUTE ON FUNCTION venda_admin.has_role(text[]) TO venda_admin_api;
GRANT EXECUTE ON FUNCTION venda_admin.resolve_identity(text,text,text) TO venda_admin_api;
GRANT SELECT ON venda_admin.users,venda_admin.plan_versions,venda_admin.audit,venda_admin.idempotency TO venda_admin_api;
GRANT SELECT,INSERT,DELETE ON venda_admin.flows TO venda_admin_api;
GRANT SELECT,INSERT ON venda_admin.sessions TO venda_admin_api;
GRANT UPDATE(revoked_at) ON venda_admin.sessions TO venda_admin_api;
GRANT INSERT ON venda_admin.plan_versions,venda_admin.audit,venda_admin.idempotency TO venda_admin_api;
GRANT UPDATE(status,revision,published_at) ON venda_admin.plan_versions TO venda_admin_api;
GRANT SELECT ON venda_admin.plan_versions TO venda_api;
RESET ROLE;
ALTER FUNCTION venda_admin.has_role(text[]) OWNER TO venda_admin_authorizer;
ALTER FUNCTION venda_admin.resolve_identity(text,text,text) OWNER TO venda_admin_identity;
GRANT SELECT ON venda_admin.users,venda_admin.sessions TO venda_admin_authorizer;
GRANT SELECT,INSERT,UPDATE ON venda_admin.users TO venda_admin_identity;
