-- Somente banco local descartável. Produção com auditoria exige plano de retenção e forward-fix.
DROP SCHEMA venda CASCADE;
-- Roles não são removidas automaticamente: podem possuir objetos externos ao schema.
