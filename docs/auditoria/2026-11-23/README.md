# Revisão funcional de 23/11/2026

Consulte [RELATORIO-FUNCIONAL.md](RELATORIO-FUNCIONAL.md) e a [matriz em JSON](evidencias/funcionalidades.json). O parecer é **não está 100% funcional e não está pronta para produção**.

Para repetir os checks, na raiz: `npm run audit:platform`. Uma primeira execução compila API/testes, executa 28 casos backend com PostgreSQL real, 16 frontend, 20 UI, build e integração de navegador. Após corrigir uma falha: `npm run audit:platform -- --retest`. Esse segundo modo preserva o histórico de comandos e repete frontend/UI/build/navegador. A falha inicial desta revisão foi perda do rascunho em erro de alteração; a rodada final tem 124 PASS e zero FAIL.

Para gerar o documento: `npm run report:platform`. Para uma revisão visual persistente: `npm run review:local`, depois acesse http://127.0.0.1:3400 no Chrome e use o acesso seguro local. O launcher exige `--demo-only`, já incluído no comando, e cria outro cluster PostgreSQL real isolado, uma identidade de protocolo simulada e uma organização DEMO_ONLY. O backend usa o contrato existente e guardas/RLS reais; não há sessão injetada diretamente em SQL. Não é produção, não é sandbox externo e não envia mensagens nem cobranças reais.

O banco da demonstração é descartado ao encerrar o processo com Ctrl+C; não foi instalado serviço Windows nem criada infraestrutura AWS. As credenciais existem somente no processo/fixture temporária. Não coloque informações pessoais ou dados de clientes neste ambiente. A faixa DEMO_ONLY só aparece com configuração explícita e origens de frontend/API em loopback.

Evidências antigas das etapas anteriores continuam preservadas. Nesta pasta, `comandos.json`, `backend-resultados.xml`, os três JSON em backend/, `integracao-inicial/`, `integracao-final/`, auditorias npm e `chrome.json` correspondem a esta revisão. O histórico inicial com FAIL permanece visível; as falhas de produto não são ocultadas pela aprovação dos testes existentes. A execução inicial pode retornar exit 1 por essa regressão; o reteste final deve retornar exit 0.

Requisitos locais: Node e dependências já instalados, Google Chrome, binários PostgreSQL do pacote de teste e espaço em disco. O timeout de processo PostgreSQL pode ser ampliado apenas na fixture de teste por `VENDA_TEST_PG_PROCESS_TIMEOUT_MS`, entre 60000 e 240000; não muda timeouts de produção. Toda API de gateway/canal permanece fora do launcher. Não foi executada a etapa 05.
