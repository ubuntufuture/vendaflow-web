# Validação da etapa UI

## Resultado entregue

Design system implementado no escopo isolado de UI: cinco tokens exatos, temas light/dark, Inter local, escala tipográfica, layout, estados, componentes, Storybook e telas candidatas de público/cliente/admin. São 39 telas candidatas, 37 P0 e duas P1, com 78 cenários de tela no Storybook e 14 cenários de componentes/estados, total de 92 histórias. O export Next contém 39 páginas de tela mais catálogo, identidade, componentes e página de sistema.

A conclusão integral do produto e a cobertura P0 do PRD não foram demonstradas. PRD V01–V24, arquitetura, segurança/governança e OpenAPI estão ausentes localmente e o repositório GitHub conectado foi confirmado vazio. O pedido da etapa 02 resolveu a ausência de tokens ao fornecer os valores exatos; o board foi recuperado do ZIP existente. Nenhuma API, DB, migration, autenticação, cobrança, integração ou infraestrutura foi implementada.

## Testes e comandos reproduzíveis

Ambiente observado: Windows, Node v24.19.0, React/React DOM 19.3.1, Next 16.4.6, Storybook 10.6.8, Chrome 157.0.8103.80. Os números abaixo descrevem execuções reais; não são testes simulados.

| Comando | Resultado | Evidência |
| --- | --- | --- |
| `npm run tokens` | Exit 0, CSS light/dark gerado | packages/ui/styles/tokens.css |
| `npm run typecheck` | Exit 0, TypeScript strict | Configuração e verificação também executadas pelo build Next |
| `npm test -- --reporter=default --reporter=json --outputFile=docs/ui/evidencias/unitarios.json` | Exit 0, 20/20 testes | [unitarios.json](evidencias/unitarios.json) |
| `npm run build:ui` | Exit 0 na primeira implementação | Export Next estático; depois recompilado com analyzer na versão final |
| `npm run analyze:ui` | Exit 0 na versão server-first, relatórios oficial Next/Webpack | [client.html](evidencias/bundle-analyzer/client.html), nodejs.html e edge.html |
| `npm run build:storybook` | Exit 0, 92 histórias e uma entrada de documentação | storybook-static/index.json reproduzível pelo build |
| `npm run test:browser` | Exit 0 final, 357 PASS/0 FAIL, 98 PNG, 97 verificações axe | [browser.json](evidencias/browser.json), [trace](evidencias/interacoes-playwright.zip), [capturas](TELAS.md) |
| `npm run audit:ui` | Exit 0, oito verificações estáticas | [tokens-e-seguranca.json](evidencias/tokens-e-seguranca.json) |
| `npm audit --json` | Exit 0 final, zero vulnerabilidades conhecidas na consulta | [npm-audit.json](evidencias/npm-audit.json) |
| `node scripts/verify-ux.mjs` | Exit 0, oito verificações de regressão documental | Executado preservando os relatórios históricos da UX; catálogo e fontes anteriores intactos |
| `npm run measure:ui` | Lighthouse com 30 navegações, cinco por rota/perfil | [performance.json](evidencias/performance.json), relatórios .json.gz e [protocolo/resultados](PERFORMANCE.md) |
| `node scripts/verify-ui.mjs` | Exit 0, 11 PASS | [verificacao-ui.json](evidencias/verificacao-ui.json) |
| `node scripts/verify-ui.mjs --release` | Exit 1, 11 PASS e dois FAIL por referências/cobertura PRD ausentes | [gate-release.json](evidencias/gate-release.json) |

No Windows deste ambiente, Vitest/Storybook exigiram execução autorizada fora do sandbox porque esbuild não podia ler diretórios necessários. Os builds e testes autorizados foram executados de fato. A primeira configuração Storybook usava opção de autodocs incompatível; foi corrigida para tags. A primeira rodada browser identificou o PNG ausente no export, corrigido e confirmado nas rodadas seguintes. Nenhuma dessas falhas foi ocultada como PASS.

## Cobertura de comportamento e acessibilidade

Vitest/Testing Library: tokens e marca; botão ocupado impede duplicação de clique; label/ajuda/erro associados; opt-in desmarcado; sete estados; timeout inconclusivo; toast dispensável; badge textual; retorno de cobrança sem ativação; separação do console; ausência de métricas fictícias; filtros; busca única; rótulo DEMO_ONLY.

Playwright/axe: 39 telas em 1440×1000 e 390×844, componentes e identidade, dark em APP03/ADM02, tablet 1024×768 em APP03/APP16/ADM03, reflow 320 em PUB01/APP03/APP16/ADM02, modal nativo com Tab/Shift+Tab/Escape/retorno de foco, filtro por Enter, menu mobile, dispensa de toast e sete estados reais do Storybook. Nenhuma exceção JavaScript ou chamada de rede externa foi encontrada nas telas. Axe foi executado com tags WCAG 2 A/AA, 2.1 A/AA e 2.2 AA; não é certificação integral.

Diff de repetibilidade APP03 desktop: zero pixels alterados em 1.440.000 pixels sob fontes prontas e animações reduzidas. Não existe baseline de telas aprovado para um diff de regressão de produto. Comparação com o board e auditoria visual individual estão detalhadas em [FIDELIDADE.md](FIDELIDADE.md). NVDA/VoiceOver, dispositivos físicos e pesquisa com participantes não foram executados.

## Segurança e disponibilidade

Sem fetch, URLs externas, segredo, localStorage, sessão ou dados de cliente no código de telas. O servidor de revisão serve somente o export em loopback, com limites de caminho e headers básicos; sua CSP permite inline exigido pelo export Next. Isso não é CSP produtiva aprovada. `.env.example` não contém credenciais inventadas e nenhum mock de API foi criado.

Quatro alertas moderados iniciais na cadeia de desenvolvimento do Storybook foram corrigidos com override escopado de glob 14.0.6, seguido de recompilação e nova auditoria com zero alertas. Referências dos problemas: [glob](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) e [minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249). O relatório inicial permanece como evidência histórica; não usar `npm audit fix --force` para trocar o framework.

Tenant isolation: telas sem tenant/dados; nenhum cache privado compartilhado foi criado, mas isolamento real ainda exige backend e PostgreSQL/RLS testados. Billing: UI não calcula entitlement, preço ou status ativo e retorno não confirma assinatura. Consentimento: exemplo opcional desmarcado e base/finalidade/canal separados semanticamente, sem criar schema. Canal: mostra configuração pendente e não inventa conexão, entrega ou envio. Identidade: placeholder em Inter, sem alegar SVG oficial. Provedores Meta/Mercado Pago não foram chamados; credenciais e testes sandbox são N/A a esta implementação visual, pendentes para a fase técnica correspondente.

## Performance e limites

Os resultados finais por rota/perfil, p75/p95, hardware, cache, rede simulada e comparação com a baseline estão em PERFORMANCE.md. O preset desktop mede 1350×940, RTT simulado 40 ms, throughput 10.240 Kbps e CPU 1×; o perfil mobile restrito usa 390×844, RTT 150 ms, 1.600/750 Kbps e CPU 4×. Origem é loopback Windows, sem borda AWS nem sessão autenticada; localização física não aferida.

Não afirmar “abre em menos de 1 segundo” com FCP/LCP do sandbox. Primeiro conteúdo útil tem definição própria, INP exige medição de interação/campo e RUM não foi instalado. OTel, APIs GET/POST p95 e carga PostgreSQL são N/A sem backend. Samples de cinco por grupo são descritivos, sem significância de campo. Gate laboratorial LCP p75 ≤2500 ms e CLS p75 ≤0,1 é restrito às três rotas medidas; os demais budgets produtivos permanecem a aprovar.

Resultado final: LCP p75 desktop entre 252,181–273,249 ms; mobile restrito entre 909,782–914,645 ms; maior LCP p95 923,369 ms e maior CLS p75 0,017. TBT p75 mobile entre 393–443,084 ms continua um risco de responsividade. A separação server/client reduziu a soma de JS gzip do inventário de 303.361 para 296.605 bytes, mas não demonstrou melhora consistente de TBT entre rotas; não declarar ganho geral. Soma de arquivos não é payload transferido por rota. Não se comparou TBT com o limite de INP como se fossem a mesma métrica.

Avisos remanescentes do build: Vite informa chunks grandes na documentação/axe e ignora a diretiva use client no renderer client-only do Storybook; Next/Webpack informa cache de build não persistido por snapshot e analyzer edge sem bundles executáveis. Os builds encerraram com exit 0; esses avisos não são apresentados como erros resolvidos nem como prova de performance. Relatório cliente do analyzer foi gerado. Componentes não carregam Storybook/axe/Lighthouse no entrypoint reutilizável.

## Checklist de aceite

| Critério | Status | Limite |
| --- | --- | --- |
| Branch própria, UX preservada e escopo UI | PASS | Sem publicação ou etapa posterior |
| Tokens exatos, Inter e sem nova paleta | PASS | Contrato visual e testes estáticos/axe |
| Light/dark, escalas, grid, motion e ícones | PASS | Dark estende a referência; revisão produtiva pendente |
| Forms/tabelas/badges/modal/toast/empty/error/loading | PASS | Componentes reais; sem integração de negócio |
| Ao menos um cenário por estado | PASS | Sete estados mais busy/disabled/read-only |
| Comparação PNG e checklist de fidelidade | PASS | Comparação lado a lado e inspeção; não alegar igualdade pixel a pixel com mockup |
| Logo somente oficial ou fallback explícito | PASS | Placeholder autorizado, SVG oficial não fornecido |
| Telas candidatas P0/admin desktop/mobile | PASS | 37/37 P0 candidatas com capturas |
| 100% de P0 do PRD demonstradas | FAIL | PRD V01–V24 ausente |
| Arquitetura, segurança e contrato existentes reconciliados | FAIL | Três documentos obrigatórios ausentes |
| Sem métricas/preços/depoimentos falsos nas telas | PASS | O PNG comparativo é referência identificada, não dado de produto |
| Conformidade WCAG 2.2 AA completa | FAIL | Automação passa; revisão assistiva e humana pendente |
| Segurança de backend/RLS/webhook/SDK sandbox | N/A | Sem camada backend nesta etapa; exigido para produto |
| RUM/INP e promessa universal de 1 s | N/A | Não disponível nem alegado; apenas laboratório local |
| Contratos de API/DB e migrations alterados | N/A | Nenhum |
| Conclusão integral para produção | FAIL | Depende das referências, validações e identidade oficial pendentes |

Próximo passo recomendado: fechar as lacunas de contrato/PRD e validar a biblioteca visual com direção de arte e acessibilidade. Não iniciar a próxima etapa de desenvolvimento sem nova instrução.
