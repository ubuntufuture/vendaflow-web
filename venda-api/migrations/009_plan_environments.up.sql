-- Test catalog entries remain identifiable and cannot enter the public production catalog.
SET LOCAL ROLE venda_owner;
ALTER TABLE venda_admin.plan_versions ADD COLUMN environment text NOT NULL DEFAULT 'production'
 CHECK(environment IN ('test','production'));
ALTER TABLE venda_admin.plan_versions ADD CONSTRAINT plan_test_namespace CHECK(
 (environment='test' AND code LIKE 'teste-%' AND name LIKE 'TESTE%') OR
 (environment='production' AND code NOT LIKE 'teste-%')
);
ALTER TABLE venda_admin.audit ADD COLUMN origin text NOT NULL DEFAULT 'admin_console'
 CHECK(origin IN ('admin_console','local_test_setup'));
DROP POLICY public_catalog_read ON venda_admin.plan_versions;
CREATE POLICY public_catalog_read ON venda_admin.plan_versions FOR SELECT TO venda_api
 USING(status='published' AND environment='production');
CREATE OR REPLACE FUNCTION venda_admin.protect_plan() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF ROW(NEW.id,NEW.code,NEW.version,NEW.name,NEW.amount_cents,NEW.currency,NEW.frequency,NEW.frequency_type,NEW.features,NEW.limits,NEW.created_by,NEW.created_at,NEW.environment)
 IS DISTINCT FROM ROW(OLD.id,OLD.code,OLD.version,OLD.name,OLD.amount_cents,OLD.currency,OLD.frequency,OLD.frequency_type,OLD.features,OLD.limits,OLD.created_by,OLD.created_at,OLD.environment)
 THEN RAISE EXCEPTION 'Immutable plan; create another version' USING ERRCODE='23514'; END IF;
 IF NOT((OLD.status='draft' AND NEW.status='published') OR (OLD.status='published' AND NEW.status='retired')) OR NEW.revision<>OLD.revision+1
 THEN RAISE EXCEPTION 'Invalid plan transition' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
RESET ROLE;
