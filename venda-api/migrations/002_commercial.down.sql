-- Apenas em banco descartável. Dados comerciais seriam perdidos.
DROP TABLE venda.tasks,venda.opportunities,venda.contacts,venda.knowledge,venda.workflows,venda.commerce_idempotency;
DROP FUNCTION venda.commerce_immutable();
DROP POLICY commerce_audit ON venda.audit;
DROP POLICY commerce_outbox ON venda.outbox;
