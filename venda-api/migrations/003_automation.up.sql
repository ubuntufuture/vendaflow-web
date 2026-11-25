DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='venda_worker') THEN CREATE ROLE venda_worker NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='venda_automation_executor') THEN CREATE ROLE venda_automation_executor NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('venda_worker','venda_automation_executor') AND (rolsuper OR rolbypassrls OR rolcanlogin)) THEN RAISE EXCEPTION 'Unsafe worker roles'; END IF;
END $$;
SET LOCAL ROLE venda_owner;
ALTER TABLE venda.workflows ADD COLUMN status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','paused'));
ALTER TABLE venda.workflows ADD COLUMN activated_at timestamptz;
ALTER TABLE venda.workflows ADD COLUMN activated_by uuid REFERENCES venda.users(id);
ALTER TABLE venda.workflows ADD UNIQUE(organization_id,id);
ALTER TABLE venda.tasks ADD UNIQUE(organization_id,id);
ALTER TABLE venda.outbox ADD COLUMN next_attempt_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE venda.outbox ADD COLUMN last_error_code text CHECK(length(last_error_code)=5);
ALTER TABLE venda.outbox ADD COLUMN dead_lettered_at timestamptz;
CREATE TABLE venda.automation_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES venda.organizations(id),workflow_id uuid NOT NULL,event_id uuid NOT NULL REFERENCES venda.outbox(id),task_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,workflow_id,event_id),FOREIGN KEY(organization_id,workflow_id) REFERENCES venda.workflows(organization_id,id),FOREIGN KEY(organization_id,task_id) REFERENCES venda.tasks(organization_id,id)
);
ALTER TABLE venda.automation_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE venda.automation_receipts FORCE ROW LEVEL SECURITY;
CREATE POLICY receipt_read ON venda.automation_receipts FOR SELECT TO venda_api USING(organization_id=venda.tenant() AND venda.has_role(organization_id,ARRAY['owner','admin','manager','agent','viewer']));
GRANT SELECT ON venda.automation_receipts TO venda_api;
ALTER TABLE venda.audit DROP CONSTRAINT audit_action_check;
ALTER TABLE venda.audit ADD CONSTRAINT audit_action_check CHECK(action IN ('organization.created','organization.updated','membership.created','membership.updated','task.automated','opportunity.won') OR action ~ '^(contact|opportunity|task|knowledge|workflow)\.(created|updated|archived)$');
CREATE POLICY won_audit ON venda.audit FOR INSERT TO venda_api WITH CHECK(organization_id=venda.tenant() AND actor_id=venda.actor() AND action='opportunity.won' AND venda.has_role(organization_id,ARRAY['owner','admin','manager','agent']));
CREATE POLICY won_outbox ON venda.outbox FOR INSERT TO venda_api WITH CHECK(organization_id=venda.tenant() AND event_type='opportunity.won' AND venda.has_role(organization_id,ARRAY['owner','admin','manager','agent']));
CREATE POLICY executor_members ON venda.memberships FOR SELECT TO venda_automation_executor USING(true);
CREATE POLICY executor_workflows ON venda.workflows FOR SELECT TO venda_automation_executor USING(true);
CREATE POLICY executor_opportunities ON venda.opportunities FOR SELECT TO venda_automation_executor USING(true);
CREATE POLICY executor_tasks ON venda.tasks TO venda_automation_executor USING(true) WITH CHECK(true);
CREATE POLICY executor_outbox ON venda.outbox TO venda_automation_executor USING(true) WITH CHECK(true);
CREATE POLICY executor_receipts ON venda.automation_receipts TO venda_automation_executor USING(true) WITH CHECK(true);
CREATE POLICY executor_audit ON venda.audit FOR INSERT TO venda_automation_executor WITH CHECK(action='task.automated');
RESET ROLE;
GRANT USAGE ON SCHEMA venda TO venda_worker,venda_automation_executor;
GRANT SELECT ON venda.memberships,venda.workflows,venda.opportunities TO venda_automation_executor;
GRANT SELECT,INSERT ON venda.tasks,venda.automation_receipts TO venda_automation_executor;
GRANT SELECT,UPDATE,INSERT ON venda.outbox TO venda_automation_executor;
GRANT INSERT ON venda.audit TO venda_automation_executor;
SET LOCAL ROLE venda_owner;
-- Private, bounded worker entry point. API role has no EXECUTE and cannot assume executor.
CREATE FUNCTION venda.execute_automation_batch(batch_size integer DEFAULT 10) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,venda AS $$
DECLARE event_row record; flow record; target_task uuid; trigger_name text; processed integer:=0;
BEGIN
 FOR event_row IN SELECT * FROM venda.outbox WHERE published_at IS NULL AND attempts<10 AND dead_lettered_at IS NULL AND next_attempt_at<=clock_timestamp() AND event_type IN ('opportunity.won','task.created') ORDER BY created_at,id LIMIT least(greatest(batch_size,1),50) FOR UPDATE SKIP LOCKED LOOP
  BEGIN
   trigger_name:=NULL;
   IF event_row.event_type='task.created' THEN trigger_name:='task.created';
   ELSIF EXISTS(SELECT 1 FROM venda.opportunities WHERE id=event_row.entity_id AND organization_id=event_row.organization_id AND stage='won' AND NOT archived) THEN trigger_name:='opportunity.won'; END IF;
   IF trigger_name IS NOT NULL THEN
    FOR flow IN SELECT w.* FROM venda.workflows w JOIN venda.memberships m ON m.organization_id=w.organization_id AND m.user_id=w.activated_by AND m.active AND m.role IN ('owner','admin','manager') WHERE w.organization_id=event_row.organization_id AND w.status='active' AND NOT w.archived AND w.trigger=trigger_name AND w.activated_at<=event_row.created_at FOR SHARE OF w,m LOOP
     IF NOT EXISTS(SELECT 1 FROM venda.automation_receipts WHERE organization_id=flow.organization_id AND workflow_id=flow.id AND event_id=event_row.id) THEN
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
RESET ROLE;
ALTER FUNCTION venda.execute_automation_batch(integer) OWNER TO venda_automation_executor;
GRANT EXECUTE ON FUNCTION venda.execute_automation_batch(integer) TO venda_worker;
