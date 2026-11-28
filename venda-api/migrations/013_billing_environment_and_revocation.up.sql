-- Forward fix: preserve the plan environment at DB level and allow a current owner
-- to recover a cancellation whose original actor lost authorization.
SET LOCAL ROLE venda_owner;
ALTER TABLE venda_admin.plan_versions ADD CONSTRAINT plan_identity_environment UNIQUE(id,environment);
ALTER TABLE venda.billing_subscriptions ADD CONSTRAINT subscription_plan_environment FOREIGN KEY(plan_id,environment) REFERENCES venda_admin.plan_versions(id,environment);
RESET ROLE;
CREATE OR REPLACE FUNCTION venda.claim_billing_command(target_environment text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,venda,venda_admin AS $$
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
   IF command.kind='create' THEN UPDATE venda.billing_subscriptions SET state='failed',updated_at=clock_timestamp() WHERE id=subscription.id;ELSIF command.kind='cancel' THEN UPDATE venda.billing_subscriptions SET state='requires_review',updated_at=clock_timestamp() WHERE id=subscription.id;END IF;RETURN NULL;
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
REVOKE ALL ON FUNCTION venda.claim_billing_command(text) FROM PUBLIC,venda_api,venda_admin_api,venda_worker;
GRANT EXECUTE ON FUNCTION venda.claim_billing_command(text) TO venda_billing_worker;
