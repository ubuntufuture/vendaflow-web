SET LOCAL ROLE venda_owner;
CREATE INDEX contacts_created_history ON venda.contacts(organization_id,created_at);
CREATE INDEX opportunities_created_history ON venda.opportunities(organization_id,created_at);
CREATE INDEX tasks_created_history ON venda.tasks(organization_id,created_at);
RESET ROLE;
