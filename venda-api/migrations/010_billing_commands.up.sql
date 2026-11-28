DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='venda_billing_worker') THEN CREATE ROLE venda_billing_worker NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='venda_billing_executor') THEN CREATE ROLE venda_billing_executor NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('venda_billing_worker','venda_billing_executor') AND (rolsuper OR rolbypassrls OR rolcanlogin)) THEN RAISE EXCEPTION 'Unsafe billing roles'; END IF;
END $$;
SET LOCAL ROLE venda_owner;
CREATE TABLE venda.billing_subscriptions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES venda.organizations(id),
 plan_id uuid NOT NULL REFERENCES venda_admin.plan_versions(id),environment text NOT NULL CHECK(environment IN ('test','production')),
 created_by uuid NOT NULL REFERENCES venda.users(id),payer_email text NOT NULL CHECK(length(payer_email)<=254),
 state text NOT NULL DEFAULT 'creating' CHECK(state IN ('creating','pending_authorization','authorized','paused','cancellation_pending','cancelled','requires_review','failed')),
 provider_id text UNIQUE,provider_updated_at timestamptz,checkout_url text,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,id),CHECK(provider_id IS NULL OR provider_id ~ '^[A-Za-z0-9_-]{1,128}$'),
 CHECK(checkout_url IS NULL OR checkout_url ~ '^https://www\.mercadopago\.com(\.br)?/subscriptions/checkout\?')
);
CREATE UNIQUE INDEX billing_one_open_subscription ON venda.billing_subscriptions(organization_id,environment) WHERE state NOT IN ('cancelled','failed');
CREATE TABLE venda.billing_commands(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL,subscription_id uuid NOT NULL,
 actor_id uuid NOT NULL REFERENCES venda.users(id),origin text NOT NULL DEFAULT 'user' CHECK(origin IN ('user','reconciler')),kind text NOT NULL CHECK(kind IN ('create','cancel','reconcile')),
 state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','processing','succeeded','retry','uncertain','dead','revoked')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 8),lease_until timestamptz,next_attempt_at timestamptz NOT NULL DEFAULT now(),
 last_error_code text CHECK(last_error_code IS NULL OR last_error_code ~ '^[a-z_]{1,40}$'),request_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,subscription_id) REFERENCES venda.billing_subscriptions(organization_id,id)
);
CREATE INDEX ON venda.billing_commands(state,next_attempt_at,created_at);
CREATE UNIQUE INDEX billing_one_pending_command ON venda.billing_commands(subscription_id,kind) WHERE state IN ('queued','processing','retry');
CREATE TABLE venda.billing_idempotency(
 organization_id uuid NOT NULL,actor_id uuid NOT NULL REFERENCES venda.users(id),scope text NOT NULL CHECK(scope IN ('checkout','cancel','reconcile')),
 key text NOT NULL CHECK(length(key) BETWEEN 16 AND 128),request_hash text NOT NULL,result jsonb NOT NULL,
 PRIMARY KEY(organization_id,actor_id,scope,key),FOREIGN KEY(organization_id) REFERENCES venda.organizations(id)
);
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['billing_subscriptions','billing_commands','billing_idempotency'] LOOP
 EXECUTE format('ALTER TABLE venda.%I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE venda.%I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY billing_read ON venda.%I FOR SELECT TO venda_api USING(organization_id=venda.tenant() AND venda.has_role(organization_id,ARRAY[''owner'',''admin'',''billing'']))',t);
 EXECUTE format('CREATE POLICY billing_insert ON venda.%I FOR INSERT TO venda_api WITH CHECK(organization_id=venda.tenant() AND venda.has_role(organization_id,ARRAY[''owner'',''admin'',''billing'']))',t);
 EXECUTE format('CREATE POLICY billing_executor ON venda.%I TO venda_billing_executor USING(true) WITH CHECK(true)',t);
 EXECUTE format('GRANT SELECT,INSERT ON venda.%I TO venda_api',t);
 EXECUTE format('GRANT SELECT,UPDATE ON venda.%I TO venda_billing_executor',t);
END LOOP; END $$;
DROP POLICY billing_insert ON venda.billing_subscriptions;
DROP POLICY billing_insert ON venda.billing_commands;
DROP POLICY billing_insert ON venda.billing_idempotency;
CREATE POLICY billing_insert ON venda.billing_subscriptions FOR INSERT TO venda_api WITH CHECK(organization_id=venda.tenant() AND created_by=venda.actor() AND venda.has_role(organization_id,ARRAY['owner','admin','billing']));
CREATE POLICY billing_insert ON venda.billing_commands FOR INSERT TO venda_api WITH CHECK(organization_id=venda.tenant() AND actor_id=venda.actor() AND venda.has_role(organization_id,ARRAY['owner','admin','billing']));
CREATE POLICY billing_insert ON venda.billing_idempotency FOR INSERT TO venda_api WITH CHECK(organization_id=venda.tenant() AND actor_id=venda.actor() AND venda.has_role(organization_id,ARRAY['owner','admin','billing']));
REVOKE INSERT ON venda.billing_subscriptions,venda.billing_commands FROM venda_api;
GRANT INSERT(id,organization_id,plan_id,environment,created_by,payer_email) ON venda.billing_subscriptions TO venda_api;
GRANT INSERT(organization_id,subscription_id,actor_id,kind,request_id) ON venda.billing_commands TO venda_api;
CREATE POLICY billing_subscription_update ON venda.billing_subscriptions FOR UPDATE TO venda_api USING(organization_id=venda.tenant() AND venda.has_role(organization_id,ARRAY['owner','admin','billing'])) WITH CHECK(state='cancellation_pending' AND organization_id=venda.tenant() AND venda.has_role(organization_id,ARRAY['owner','admin','billing']));
GRANT UPDATE(state,updated_at) ON venda.billing_subscriptions TO venda_api;
CREATE POLICY billing_test_catalog ON venda_admin.plan_versions FOR SELECT TO venda_api USING(status='published' AND environment='test' AND current_setting('venda.billing_environment',true)='test' AND venda.has_role(venda.tenant(),ARRAY['owner','admin','billing']));
CREATE POLICY billing_executor_catalog ON venda_admin.plan_versions FOR SELECT TO venda_billing_executor USING(true);
CREATE POLICY billing_executor_memberships ON venda.memberships FOR SELECT TO venda_billing_executor USING(true);
ALTER TABLE venda.audit DROP CONSTRAINT audit_action_check;
ALTER TABLE venda.audit ADD CONSTRAINT audit_action_check CHECK(action IN ('organization.created','organization.updated','membership.created','membership.updated','opportunity.won','task.automated','privacy.consent.recorded','privacy.request.created','privacy.export.read','billing.checkout.requested','billing.cancel.requested','billing.reconcile.requested') OR action ~ '^(contact|opportunity|task|knowledge|workflow)\.(created|updated|archived)$' OR action ~ '^workflow\.(activated|paused|executed)$');
CREATE POLICY billing_audit ON venda.audit FOR INSERT TO venda_api WITH CHECK(organization_id=venda.tenant() AND actor_id=venda.actor() AND action IN ('billing.checkout.requested','billing.cancel.requested','billing.reconcile.requested') AND venda.has_role(organization_id,ARRAY['owner','admin','billing']));
CREATE POLICY billing_outbox ON venda.outbox FOR INSERT TO venda_api WITH CHECK(organization_id=venda.tenant() AND event_type IN ('billing.checkout.requested','billing.cancel.requested','billing.reconcile.requested') AND venda.has_role(organization_id,ARRAY['owner','admin','billing']));
CREATE FUNCTION venda.protect_subscription() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF ROW(NEW.id,NEW.organization_id,NEW.plan_id,NEW.environment,NEW.created_by,NEW.payer_email,NEW.created_at) IS DISTINCT FROM ROW(OLD.id,OLD.organization_id,OLD.plan_id,OLD.environment,OLD.created_by,OLD.payer_email,OLD.created_at) THEN RAISE EXCEPTION 'Immutable subscription identity' USING ERRCODE='23514'; END IF;RETURN NEW;END $$;
CREATE TRIGGER immutable_subscription BEFORE UPDATE ON venda.billing_subscriptions FOR EACH ROW EXECUTE FUNCTION venda.protect_subscription();
-- Worker leases contain only billing data. No access to contacts, sessions or the admin console.
CREATE FUNCTION venda.claim_billing_command(target_environment text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,venda,venda_admin AS $$
DECLARE command record; subscription record; plan record;
BEGIN
 IF target_environment NOT IN ('test','production') THEN RAISE EXCEPTION 'Invalid environment'; END IF;
 UPDATE venda.billing_commands c SET state=CASE WHEN c.kind='create' THEN 'uncertain' ELSE 'retry' END,lease_until=NULL,last_error_code='lease_expired',updated_at=clock_timestamp()
 FROM venda.billing_subscriptions s WHERE c.subscription_id=s.id AND s.environment=target_environment AND c.state='processing' AND c.lease_until<clock_timestamp();
 UPDATE venda.billing_subscriptions s SET state='requires_review',updated_at=clock_timestamp() WHERE s.environment=target_environment AND s.state='creating' AND EXISTS(SELECT 1 FROM venda.billing_commands c WHERE c.subscription_id=s.id AND c.kind='create' AND c.state='uncertain');
 INSERT INTO venda.billing_commands(organization_id,subscription_id,actor_id,kind,request_id,origin)
 SELECT s.organization_id,s.id,s.created_by,'reconcile',gen_random_uuid(),'reconciler' FROM venda.billing_subscriptions s
 WHERE s.environment=target_environment AND s.provider_id IS NOT NULL AND s.state IN ('pending_authorization','authorized','paused','cancellation_pending') AND s.updated_at<clock_timestamp()-interval '60 seconds'
 AND NOT EXISTS(SELECT 1 FROM venda.billing_commands c WHERE c.subscription_id=s.id AND c.state IN ('queued','processing','retry')) LIMIT 5 ON CONFLICT DO NOTHING;
 FOR command IN SELECT c.* FROM venda.billing_commands c JOIN venda.billing_subscriptions s ON s.id=c.subscription_id WHERE s.environment=target_environment AND c.state IN ('queued','retry') AND c.attempts<8 AND c.next_attempt_at<=clock_timestamp() ORDER BY c.created_at,c.id LIMIT 1 FOR UPDATE OF c SKIP LOCKED LOOP
  SELECT * INTO subscription FROM venda.billing_subscriptions WHERE id=command.subscription_id FOR UPDATE;
  IF command.origin='user' AND NOT EXISTS(SELECT 1 FROM venda.memberships WHERE organization_id=command.organization_id AND user_id=command.actor_id AND active AND role IN ('owner','admin','billing')) THEN
   UPDATE venda.billing_commands SET state='revoked',updated_at=clock_timestamp() WHERE id=command.id;
   IF command.kind='create' THEN UPDATE venda.billing_subscriptions SET state='failed',updated_at=clock_timestamp() WHERE id=subscription.id;END IF;RETURN NULL;
  END IF;
  IF command.kind='cancel' AND subscription.provider_id IS NULL THEN
   IF EXISTS(SELECT 1 FROM venda.billing_commands WHERE subscription_id=subscription.id AND kind='create' AND state='processing') THEN
    UPDATE venda.billing_commands SET next_attempt_at=clock_timestamp()+interval '5 seconds' WHERE id=command.id;RETURN NULL;
   ELSIF EXISTS(SELECT 1 FROM venda.billing_commands WHERE subscription_id=subscription.id AND kind='create' AND state='uncertain') THEN
    UPDATE venda.billing_commands SET state='dead',last_error_code='provider_unknown',updated_at=clock_timestamp() WHERE id=command.id;
    UPDATE venda.billing_subscriptions SET state='requires_review',updated_at=clock_timestamp() WHERE id=subscription.id;RETURN NULL;
   ELSE
    UPDATE venda.billing_commands SET state='revoked',updated_at=clock_timestamp() WHERE subscription_id=subscription.id AND kind='create' AND state='queued';
    UPDATE venda.billing_commands SET state='succeeded',updated_at=clock_timestamp() WHERE id=command.id;
    UPDATE venda.billing_subscriptions SET state='cancelled',updated_at=clock_timestamp() WHERE id=subscription.id;RETURN NULL;
   END IF;
  END IF;
  IF command.kind='create' AND subscription.state<>'creating' THEN UPDATE venda.billing_commands SET state='revoked',updated_at=clock_timestamp() WHERE id=command.id;RETURN NULL;END IF;
  SELECT * INTO plan FROM venda_admin.plan_versions WHERE id=subscription.plan_id AND environment=target_environment;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan environment mismatch'; END IF;
  UPDATE venda.billing_commands SET state='processing',attempts=attempts+1,lease_until=clock_timestamp()+interval '40 seconds',updated_at=clock_timestamp() WHERE id=command.id;
  RETURN jsonb_build_object('commandId',command.id,'subscriptionId',subscription.id,'organizationId',subscription.organization_id,'kind',command.kind,'attempt',command.attempts+1,'providerId',subscription.provider_id,'environment',subscription.environment,'payerEmail',subscription.payer_email,'amountCents',plan.amount_cents,'frequency',plan.frequency,'frequencyType',plan.frequency_type,'reason',plan.name);
 END LOOP;RETURN NULL;
END $$;
CREATE FUNCTION venda.finish_billing_command(command_id uuid,attempt_number integer,result jsonb,error_code text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,venda AS $$
DECLARE command record; subscription record; mapped text;
BEGIN
 SELECT * INTO command FROM venda.billing_commands WHERE id=command_id AND state='processing' AND attempts=attempt_number AND lease_until>clock_timestamp() FOR UPDATE;
 IF NOT FOUND THEN RETURN false;END IF;
 SELECT * INTO subscription FROM venda.billing_subscriptions WHERE id=command.subscription_id FOR UPDATE;
 IF error_code IS NOT NULL THEN
  IF error_code !~ '^[a-z_]{1,40}$' THEN RAISE EXCEPTION 'Invalid diagnostic'; END IF;
  UPDATE venda.billing_commands SET state=CASE WHEN kind='create' THEN 'uncertain' WHEN attempts>=8 THEN 'dead' ELSE 'retry' END,last_error_code=error_code,lease_until=NULL,next_attempt_at=clock_timestamp()+make_interval(secs=>least(900,power(2,attempts)::integer*5)+random()*5),updated_at=clock_timestamp() WHERE id=command_id;
  IF command.kind='create' THEN UPDATE venda.billing_subscriptions SET state='requires_review',updated_at=clock_timestamp() WHERE id=subscription.id;END IF;RETURN true;
 END IF;
 IF result->>'reference' IS DISTINCT FROM subscription.id::text OR result->>'id' IS NULL OR result->>'updatedAt' IS NULL OR result->>'id' !~ '^[A-Za-z0-9_-]{1,128}$' OR (subscription.provider_id IS NOT NULL AND subscription.provider_id<>result->>'id') THEN RAISE EXCEPTION 'Provider identity mismatch'; END IF;
 mapped:=CASE result->>'status' WHEN 'pending' THEN 'pending_authorization' WHEN 'authorized' THEN 'authorized' WHEN 'paused' THEN 'paused' WHEN 'cancelled' THEN 'cancelled' ELSE NULL END;
 IF mapped IS NULL THEN RAISE EXCEPTION 'Invalid provider state'; END IF;
 IF result->>'checkoutUrl' IS NOT NULL AND result->>'checkoutUrl' !~ '^https://www\.mercadopago\.com(\.br)?/subscriptions/checkout\?' THEN RAISE EXCEPTION 'Invalid checkout URL'; END IF;
 IF (subscription.provider_updated_at IS NULL OR (result->>'updatedAt')::timestamptz>=subscription.provider_updated_at) AND (subscription.state<>'cancelled' OR mapped='cancelled') THEN
  UPDATE venda.billing_subscriptions SET provider_id=result->>'id',provider_updated_at=(result->>'updatedAt')::timestamptz,checkout_url=result->>'checkoutUrl',state=CASE WHEN state='cancellation_pending' AND mapped<>'cancelled' THEN state ELSE mapped END,updated_at=clock_timestamp() WHERE id=subscription.id;
 END IF;
 UPDATE venda.billing_commands SET state='succeeded',lease_until=NULL,last_error_code=NULL,updated_at=clock_timestamp() WHERE id=command_id;RETURN true;
END $$;
RESET ROLE;
GRANT USAGE ON SCHEMA venda,venda_admin TO venda_billing_executor;
GRANT USAGE ON SCHEMA venda TO venda_billing_worker;
GRANT SELECT ON venda.memberships,venda_admin.plan_versions TO venda_billing_executor;
GRANT INSERT ON venda.billing_commands TO venda_billing_executor;
ALTER FUNCTION venda.claim_billing_command(text) OWNER TO venda_billing_executor;
ALTER FUNCTION venda.finish_billing_command(uuid,integer,jsonb,text) OWNER TO venda_billing_executor;
REVOKE ALL ON FUNCTION venda.claim_billing_command(text),venda.finish_billing_command(uuid,integer,jsonb,text) FROM PUBLIC,venda_api,venda_admin_api,venda_worker;
GRANT EXECUTE ON FUNCTION venda.claim_billing_command(text),venda.finish_billing_command(uuid,integer,jsonb,text) TO venda_billing_worker;
