-- Per-schema default ACL revocations do not remove PostgreSQL's global PUBLIC
-- function EXECUTE default. Revoke globally for this product's owner and close
-- existing ACLs explicitly, preserving the intended service-specific grants.
ALTER DEFAULT PRIVILEGES FOR ROLE venda_owner REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA venda,venda_admin FROM PUBLIC;
GRANT EXECUTE ON FUNCTION venda.actor(),venda.tenant() TO venda_api,venda_authorizer,venda_bootstrap;
GRANT EXECUTE ON FUNCTION venda.has_role(uuid,text[]),venda.create_organization(uuid,text,text),venda.resolve_identity(text,text) TO venda_api;
GRANT EXECUTE ON FUNCTION venda.has_role(uuid,text[]) TO venda_owner;
GRANT EXECUTE ON FUNCTION venda.execute_automation_batch(integer) TO venda_worker;
GRANT EXECUTE ON FUNCTION venda_admin.actor() TO venda_admin_api,venda_admin_authorizer;
GRANT EXECUTE ON FUNCTION venda_admin.has_role(text[]),venda_admin.resolve_identity(text,text,text) TO venda_admin_api;
GRANT EXECUTE ON FUNCTION venda.claim_billing_command(text),venda.finish_billing_command(uuid,integer,jsonb,text) TO venda_billing_worker;
