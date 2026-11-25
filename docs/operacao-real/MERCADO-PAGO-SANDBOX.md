# Mercado Pago — credenciais sandbox

Atualização de 25/11/2026. O usuário confirmou o uso das credenciais de teste fornecidas. Elas foram armazenadas somente em `D:\VendaFlowAi-runtime\secrets.json`, no objeto `mercadoPagoSandbox`, preservando a ACL privada existente. Nenhum valor de credencial foi incluído no repositório, relatório ou log.

## Implementado e executado

- Port de leitura `BillingReadPort` e adapter backend `MercadoPagoSandboxReadClient` em `venda-api/src/billing/mercado-pago.ts`.
- Configuração explícita `mode: test`, país BR e somente leitura; prefixo APP_USR não é usado como prova isolada de ambiente.
- GET fixo em `https://api.mercadopago.com/users/me`, timeout de oito segundos, redirects proibidos e resposta limitada a 128 KiB. Sem retries automáticos para a verificação.
- Erros classificados sem imprimir respostas do provedor, credenciais, IDs de conta ou dados pessoais. O adapter mantém o token em campo privado.
- Consulta real executada: autenticação confirmada, site brasileiro e marcador `test_user` retornado pelo provedor. Evidência sanitizada: `evidencias/mercadopago-conexao.json`.
- A Public Key foi armazenada e validada quanto ao formato; tokenização com o SDK e correspondência funcional entre as duas chaves ainda não foram exercitadas.
- Zero assinaturas e zero cobranças criadas. O adapter não oferece operações de escrita e não altera assinatura/entitlements da plataforma.

Após compilar a API, executar na raiz:

```powershell
npm --prefix venda-api run build
npm run check:mercadopago
```

As credenciais não são distribuídas com o clone. Configure-as no armazenamento privado do ambiente autorizado; nunca em `NEXT_PUBLIC_*`, código, fixtures ou arquivos versionados. O worker não recebe esse arquivo nem herda o token.

## Falta para assinatura recorrente operacional

1. Definir nomes, preços reais em BRL, periodicidade e recursos de cada plano. Não foram inventados valores ou IDs de plano.
2. Implementar contrato OpenAPI e persistência de planos, assinaturas, comandos idempotentes e vínculo imutável com a organização.
3. Implementar checkout/tokenização oficial, criação/consulta/cancelamento de assinatura e estados de pagamento. Não tratar retorno do navegador como pagamento confirmado.
4. Configurar URL HTTPS pública e segredo próprio de assinatura de webhook, distinto do Access Token; validar assinatura oficial, eventos duplicados e ordem de chegada.
5. Implementar processamento durável, reconciliador, retentativas limitadas/DLQ e entitlements decididos pelo backend.
6. Validar cenários de aprovação, rejeição, inadimplência, cancelamento, expiração, indisponibilidade e recuperação com os meios de pagamento de teste oficiais. Nenhum desses cenários foi declarado aprovado pela consulta de identidade.

## Referências oficiais consultadas

- [Credenciais de assinaturas](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/credentials): credenciais de teste podem usar APP_USR; confirmar ambiente na aplicação.
- [Contas de teste](https://www.mercadopago.com.br/developers/en/docs/subscriptions/additional-content/your-integrations/test/accounts).
- [Criação de assinatura](https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/create-preapproval/post).

A instalação do plugin Codex é independente da integração HTTP: o marketplace fornecido retornou repositório não encontrado. A verificação acima usa a API oficial diretamente e não depende de um plugin instalado.

## Verificação de código

`npm --prefix venda-api run build`: PASS. Compilação strict de `venda-api/tsconfig.json`: PASS. `node --test dist/test/mercado-pago.test.js` a partir de venda-api: 8 PASS / 0 FAIL, cobrindo host fixo, redirecionamento, sanitização, ambientes, 401/403/429/503, timeout e limites de resposta. A primeira rodada rejeitou fixtures que continham `_` no valor do token; as fixtures foram corrigidas sem afrouxar o validador de credenciais.

Não foram alterados endpoints públicos, contratos OpenAPI ou migrations nesta alteração. A consulta ao provedor foi real; as respostas simuladas ficam restritas aos testes unitários DEMO_ONLY.
