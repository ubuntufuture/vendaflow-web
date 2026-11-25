-- Rollback integral é permitido pelo migrator apenas em banco de teste descartável.
DROP FUNCTION venda.execute_automation_batch(integer);
DROP TABLE venda.automation_receipts;
