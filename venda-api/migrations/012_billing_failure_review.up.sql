-- Forward fix: exhausted cancellation/reconciliation retries must become visible for review.
CREATE OR REPLACE FUNCTION venda.finish_billing_command(command_id uuid,attempt_number integer,result jsonb,error_code text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,venda AS $$
DECLARE command record; subscription record; mapped text;
BEGIN
 SELECT * INTO command FROM venda.billing_commands WHERE id=command_id AND state='processing' AND attempts=attempt_number AND lease_until>clock_timestamp() FOR UPDATE;
 IF NOT FOUND THEN RETURN false;END IF;
 SELECT * INTO subscription FROM venda.billing_subscriptions WHERE id=command.subscription_id FOR UPDATE;
 IF error_code IS NOT NULL THEN
  IF error_code !~ '^[a-z_]{1,40}$' THEN RAISE EXCEPTION 'Invalid diagnostic'; END IF;
  UPDATE venda.billing_commands SET state=CASE WHEN kind='create' THEN 'uncertain' WHEN attempts>=8 THEN 'dead' ELSE 'retry' END,last_error_code=error_code,lease_until=NULL,next_attempt_at=clock_timestamp()+make_interval(secs=>least(900,power(2,attempts)::integer*5)+random()*5),updated_at=clock_timestamp() WHERE id=command_id;
  IF command.kind='create' OR command.attempts>=8 THEN UPDATE venda.billing_subscriptions SET state='requires_review',updated_at=clock_timestamp() WHERE id=subscription.id;END IF;RETURN true;
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
REVOKE ALL ON FUNCTION venda.finish_billing_command(uuid,integer,jsonb,text) FROM PUBLIC,venda_api,venda_admin_api,venda_worker;
GRANT EXECUTE ON FUNCTION venda.finish_billing_command(uuid,integer,jsonb,text) TO venda_billing_worker;
