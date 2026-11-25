CREATE OR REPLACE FUNCTION venda.execute_automation_batch(batch_size integer DEFAULT 10) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,venda AS $$
DECLARE event_row record; flow record; target_task uuid; trigger_name text; processed integer:=0;
BEGIN
 FOR event_row IN SELECT * FROM venda.outbox WHERE published_at IS NULL AND attempts<10 AND dead_lettered_at IS NULL AND next_attempt_at<=clock_timestamp() AND event_type IN ('opportunity.won','task.created') ORDER BY created_at,id LIMIT least(greatest(batch_size,1),50) FOR UPDATE SKIP LOCKED LOOP
  BEGIN
   trigger_name:=NULL;
   IF event_row.event_type='task.created' THEN trigger_name:='task.created';
   ELSIF EXISTS(SELECT 1 FROM venda.opportunities WHERE id=event_row.entity_id AND organization_id=event_row.organization_id AND stage='won' AND NOT archived) THEN trigger_name:='opportunity.won'; END IF;
   IF trigger_name IS NOT NULL THEN
    FOR flow IN SELECT w.* FROM venda.workflows w WHERE w.organization_id=event_row.organization_id AND w.status='active' AND NOT w.archived AND w.trigger=trigger_name AND w.activated_at<=event_row.created_at LOOP
     PERFORM pg_advisory_xact_lock_shared(hashtextextended('venda.membership.'||flow.organization_id::text||':'||flow.activated_by::text,0));
     PERFORM pg_advisory_xact_lock_shared(hashtextextended('venda.workflow.'||flow.organization_id::text||':'||flow.id::text,0));
     IF EXISTS(SELECT 1 FROM venda.memberships WHERE organization_id=flow.organization_id AND user_id=flow.activated_by AND active AND role IN ('owner','admin','manager')) AND EXISTS(SELECT 1 FROM venda.workflows WHERE id=flow.id AND organization_id=flow.organization_id AND status='active' AND NOT archived AND activated_by=flow.activated_by AND activated_at<=event_row.created_at) AND NOT EXISTS(SELECT 1 FROM venda.automation_receipts WHERE organization_id=flow.organization_id AND workflow_id=flow.id AND event_id=event_row.id) THEN
      INSERT INTO venda.tasks(organization_id,title,opportunity_id) VALUES(flow.organization_id,flow.task_title,CASE WHEN trigger_name='opportunity.won' THEN event_row.entity_id ELSE NULL END) RETURNING id INTO target_task;
      INSERT INTO venda.automation_receipts(organization_id,workflow_id,event_id,task_id) VALUES(flow.organization_id,flow.id,event_row.id,target_task);
      INSERT INTO venda.audit(organization_id,actor_id,action,entity_id,request_id) VALUES(flow.organization_id,flow.activated_by,'task.automated',target_task,event_row.request_id);
      -- A generated task emits a distinct event; automation chaining is deliberately bounded.
      INSERT INTO venda.outbox(organization_id,event_type,entity_id,request_id) VALUES(flow.organization_id,'task.automated',target_task,event_row.request_id);
     END IF;
    END LOOP;
   END IF;
   UPDATE venda.outbox SET published_at=clock_timestamp(),last_error_code=NULL WHERE id=event_row.id;
   processed:=processed+1;
  EXCEPTION WHEN OTHERS THEN
   UPDATE venda.outbox SET attempts=attempts+1,last_error_code=SQLSTATE,next_attempt_at=clock_timestamp()+(least(300,power(2,attempts)::integer)+random()*3)*interval '1 second',dead_lettered_at=CASE WHEN attempts+1>=10 THEN clock_timestamp() ELSE NULL END WHERE id=event_row.id;
  END;
 END LOOP;
 RETURN processed;
END $$;
REVOKE ALL ON FUNCTION venda.execute_automation_batch(integer) FROM PUBLIC,venda_api;
GRANT EXECUTE ON FUNCTION venda.execute_automation_batch(integer) TO venda_worker;
