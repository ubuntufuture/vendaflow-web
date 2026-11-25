# Execução local real

O código permanece em `C:\Users\UBUNTU FUTURE\VendaFlowAi`. PostgreSQL persistente, Keycloak e Java ficam em `D:\VendaFlowAi-runtime`, unidade autorizada pelo usuário. Esse ambiente é de desenvolvimento, não de produção.

## Iniciar

No PowerShell, a partir da raiz do repositório:

```powershell
npm run build:platform
npm run setup:local
```

O primeiro comando compila API, worker e web. O segundo aplica migrations pendentes, inicia PostgreSQL e Keycloak e conserva os dados existentes. Se ele iniciou o Keycloak, mantenha esse terminal aberto. Em outro terminal:

```powershell
npm run start:local
```

Abra http://127.0.0.1:3400/entrar. O acesso leva ao Keycloak real em loopback. Use “Cadastre-se” para criar sua própria identidade; nenhuma conta comercial foi pré-criada. A senha é definida pelo usuário no provedor, nunca pelo agente ou no chat. Após o acesso, crie sua organização com o fuso IANA correto.

- Web: `127.0.0.1:3400`.
- API: `127.0.0.1:3201`; `GET /health`, `GET /ready`, `GET /v1/openapi.json`.
- Identidade: `127.0.0.1:38080`, realm `venda-flow-local`.
- Banco: `127.0.0.1:55432`, database `venda_flow_local`.
- Worker: processo separado, com role própria e sem endpoint público.

Ctrl+C no launcher encerra a aplicação. Não apague o diretório de dados para reiniciar. HTTP só é aceito por configuração explícita de desenvolvimento em loopback; a configuração de produção exige HTTPS/TLS e não aceita essa exceção.

Segredos ficam nos arquivos privados do runtime com ACL do Windows; `.local/runtime-location.json` guarda somente o caminho e é ignorado pelo Git. Não envie esses arquivos por chat, commit ou relatório. O launcher não carrega fixtures ou provedor de identidade simulado.

## Verificar sem popular a plataforma

```powershell
npm --prefix venda-api run contract
npm run contract:web
npm run test:web
$env:VENDA_TEST_RUNTIME_DIR='D:/VendaFlowAi-runtime/test-clusters'
npm --prefix venda-api test
$env:VENDA_WEB_EVIDENCE_DIR='docs/operacao-real/evidencias/browser'
$env:VENDA_TEST_REAL_OIDC='true'
npm run test:web:browser
node scripts/snapshot-local-runtime.mjs
node scripts/report-real-platform.mjs
```

Os testes de browser usam porta 3491, cluster PostgreSQL descartável e realm Keycloak temporário exclusivos. Os registros DEMO_ONLY existem somente nesse ambiente de testes. O snapshot consulta o banco persistente em modo de leitura e publica apenas contagens e saúde, sem credenciais.

## Limites atuais

Contatos, oportunidades, tarefas, conhecimento textual e automações internas têm persistência real. O worker cria tarefas por eventos locais autorizados; não envia mensagens. O valor de propostas não representa receita recebida.

WhatsApp, Mercado Pago, IA/RAG, e-mail transacional, console administrativo separado e fluxos completos de consentimento/DSAR ainda exigem implementação e validação. Recuperação por e-mail está indisponível sem SMTP. Este ambiente não deve ser publicado na internet como plataforma concluída.
