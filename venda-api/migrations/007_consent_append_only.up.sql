SET LOCAL ROLE venda_owner;
CREATE TRIGGER consent_append_only BEFORE UPDATE OR DELETE ON venda.consents FOR EACH ROW EXECUTE FUNCTION venda.append_only();
RESET ROLE;
