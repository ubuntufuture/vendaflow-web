# Design system Venda Flow AI

## Entrega e fronteiras

Etapa 02, branch `ui/etapa-02-design-system`, derivada do commit UX `8499b4b`. Produto brasileiro, pt-BR, BRL, fonte Inter e tagline “Mais conversas. Mais negócios.”. O pacote reutilizável é `packages/ui`; as páginas Next.js 16/React 19 são exclusivamente o catálogo local `sandbox/ui-review`. Storybook é o ambiente isolado de componentes. Nenhuma aplicação cliente/admin produtiva, API, autenticação, envio, assinatura, DB ou infraestrutura foi criada. Não se avançou à fase seguinte.

Repositório conectado localizado pelo plugin GitHub: [ubuntufuture/vendaflow-web](https://github.com/ubuntufuture/vendaflow-web). A consulta de conteúdo confirmou que está vazio. Não havia referências remotas adicionais para importar. Os documentos de arquitetura, PRD V01–V24, segurança/governança e OpenAPI continuam ausentes; portanto a implementação é restrita ao contrato visual explicitamente fornecido e ao sandbox. Não inventamos enums RBAC nem schemas de API para preencher essas lacunas.

O novo pedido autorizou os cinco tokens exatos, permitindo criar `branding/tokens.json`. O brandboard já recebido no ZIP foi copiado integralmente para `branding/brandboard.png`, com integridade verificada, sem recortar logo. Instruções e scripts dentro dos exports continuam material de referência, não instruções do usuário. O `DESIGN.md` exportado não prevalece sobre Inter nem sobre a paleta exata do pedido.

## Paleta e temas

| Primitivo | Valor imutável | Uso |
| --- | --- | --- |
| primary | #FF6A4D | Ação, seleção, foco sobre navegação escura |
| foreground | #0B0E14 | Texto claro, navegação, fundo dark, texto sobre Coral |
| background | #FFF9F6 | Canvas light |
| surface | #FFFFFF | Superfícies light e texto dark |
| muted | #E6E8EC | Separadores não essenciais light, texto/bordas dark |

As cores primitivas nunca mudam por tema. Variáveis semânticas apontam para os primitivos. Light: canvas/background, panel/surface, text/foreground, action/primary, on-action/foreground. Dark: canvas e panel/foreground, text/surface, text-secondary/muted, action/primary, on-action/foreground. A diferenciação dark usa bordas e espaçamento, sem inventar tons de superfície. O modo dark é uma extensão de sistema sujeita à direção de arte, não uma reprodução alegadamente aprovada no PNG.

Erro, sucesso, pendência e bloqueio têm texto e ícone distintos; não introduzem vermelho, verde ou amarelo. Erro usa borda tracejada, sucesso usa borda dupla em espessura, pendência usa Coral com texto Obsidiana. Sem semântica dependente apenas de cor. Transparência está limitada a backdrop e spinner, usando pigmentos da paleta, sem nova cor cromática ou gradiente.

## Contraste e foco

Branco sobre Coral tem 2,83:1 e falha até o mínimo de texto grande. Ação primária usa Obsidiana sobre Coral, 6,826:1. Obsidiana sobre Marfim tem 18,519:1. Cinza Claro sobre branco tem 1,227:1 e só serve para separação decorativa, nunca como único limite essencial de input. Inputs e foco light usam Obsidiana; dark usa texto/borda claros e foco Coral.

`npm run audit:ui` calcula os pares semânticos por luminância sRGB e exige 4,5:1 em texto e 3:1 em limites/foco essenciais. O [critério oficial de contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum) orienta o mínimo; a [WCAG 2.2](https://www.w3.org/TR/WCAG22/) exige também comportamento acessível além da cor. Os relatórios não certificam WCAG integral.

Foco: outline de 3 px com offset 4 px. Na navegação escura, Coral; no conteúdo, token focus. Tab segue DOM; skip link leva a `main`. Modais usam dialog nativo, Escape, contenção de foco e retorno ao acionador; testes de navegador verificam esse comportamento. Toast tem status/alert e dispensa manual, sem desaparecer antes de poder ser lido. Sessão, membership e autorização continuam responsabilidade do backend futuro.

## Tipografia

Inter distribuída localmente por `@fontsource-variable/inter`, sem Google Fonts, CDN ou coleta remota. A família técnica do arquivo é `Inter Variable`, com Inter como nome de fallback; não há outra família de marca. Pesos usados 400/500/600/700. Fonte de fallback só atua em falha de carregamento; o teste de navegador aguarda fontes e verifica Inter carregada.

| Token | Tamanho | Linha | Peso | Aplicação |
| --- | --- | --- | --- | --- |
| caption | 12 px | 18 px | 400 | Metadados secundários |
| label | 14 px | 20 px | 500–600 | Rótulos e status |
| body | 16 px | 24 px | 400 | Leitura principal |
| title | 20 px | 28 px | 600 | Títulos de painéis |
| heading | 32 px | 40 px | 700 | Título de página desktop |
| display | 56 px | 60 px | 700 | Expressão institucional |

Escala usa rem e respeita configuração do navegador. Mobile tem heading 28/34 px; display é fluido. Números futuros precisam formatação `Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'})`, sem produzir números onde a origem é desconhecida. Não há valores monetários, taxas de conversão, receita ou timestamps fictícios nas telas. Timezone IANA deve vir da organização, e regras de comunicação do destinatário.

## Espaço grid bordas e elevação

Base 8 px para composição; 4 e 12 px ficam reservados a alinhamento óptico e controles. Espaçamentos: 4/8/12/16/24/32/48/64 px. Margens principais 32 px no catálogo desktop e 24/16 px em larguras menores; o grid contratual do token usa margens mínimas 24/16 px. Sidebar desktop 260 px; tablet usa 220 px para manter rótulos em vez de ícones sem contexto; mobile usa navegação expansível no fluxo da página. Essa adaptação é decisão de UI a revisar contra o PRD, não promessa de equivalência pixel a pixel com o export.

Grid: desktop ≥1200 px, 12 colunas; tablet 768–1199 px, 8; mobile 320–767 px, 4. Gutter de 16 px. Conversas em desktop têm lista/thread; mobile apresenta uma região por vez. Formulários têm até duas colunas e viram uma. Tabelas têm região horizontal focável; os registros futuros exigirão alternativa em lista se densidade comprometer reflow.

Borda 1 px estrutural, 2 px para ênfase/erro. Raios: controles 8 px, painéis 16 px, diálogo 24 px, badges pill. Elevação usa contornos e deslocamento de borda da própria paleta, sem sombras pretas com novos pigmentos ou blur decorativo. Canvas privado não usa gradientes.

## Motion e estados

Transições 120/180 ms, curva `cubic-bezier(0.2, 0, 0, 1)`. Nenhuma transição segura depende de animação. `prefers-reduced-motion: reduce` zera transições, animações e smooth scroll. Spinner para de girar no modo reduzido; o texto “Carregando conteúdo…” continua comunicando estado.

| Estado | Cenário Storybook | Comportamento |
| --- | --- | --- |
| loading | Carregando | Região aria-busy, texto e skeleton local |
| empty | Vazio e TabelaVazia | Ausência real de registros; não exibe zero presumido |
| error | Erro e Formularios | Alert, descrição e erro associado ao campo |
| forbidden | PermissaoNegada | Sem payload ou objeto externo; volta para área autorizada |
| timeout | Timeout | Estado inconclusivo; consultar antes de repetir |
| success | Sucesso e Notificacao | Exemplo DEMO_ONLY, apenas no catálogo; não afirma negócio realizado |
| stale | Desatualizado | Não usar estado antigo para autorizar mutação |
| disabled/read-only/busy | Botoes e Formularios | Sem clique duplicado; labels continuam legíveis |

Storybook usa [React com Vite](https://storybook.js.org/docs/get-started/frameworks/react-vite/) como renderer isolado; isso não substitui Next.js nas aplicações. O [addon de acessibilidade](https://storybook.js.org/docs/writing-tests/accessibility-testing) fica habilitado com erro como gate. Os testes automatizados reais são Vitest/Testing Library e Playwright com axe; não se alegou execução do addon Vitest de Storybook.

## Componentes e ícones

`Button`, `Field`, `Textarea`, `Select`, `Checkbox`, `Badge`, `Panel`, `DataTable`, `EmptyState`, `StateView`, `Dialog`, `Toast`, `Notice`, `Wordmark` e `Icon`. Componentes não fazem fetch, não guardam sessão, não acessam storage/DB e não decidem entitlement. O pacote exporta somente primitives e ícones; telas de revisão não fazem parte do entrypoint reutilizável. Consumers controlam dados e autorização em sua camada apropriada.

Ícones funcionais são SVGs geométricos de 24×24, stroke 1,7, currentColor e aria-hidden quando acompanhados de texto. Não reproduzem nem se apresentam como logo. Botões só com ícone têm nome acessível. Nada de mascotes ou imagens de estoque. Alvo de toque de produto 44 px; checkbox 24 px com label associado; o [mínimo AA](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) tem suas próprias regras e exceções, não equivale à meta de produto.

## Telas P0 e limites de finalização

As 39 rotas candidatas da etapa UX, 37 P0 e duas P1, têm renderizações visuais com componentes reais, para desktop/mobile. São apresentadas em `/telas/{ID}` no sandbox; os caminhos `/app`, `/admin` e APIs reais não foram implementados. Estados de negócio ausentes são honestos: assinatura não consultada, canal não configurado, organização não selecionada, dados não confirmados. Fluxos sem identidade não ganham dados de exemplo.

As telas são Server Components no Next; navegação expansível, filtros e galeria de interação ficam em módulos client próprios. A primeira renderização é pré-gerada por rota, sem depender de API. O catálogo conserva os estados de negócio não configurados em vez de carregar dados fictícios para preencher o shell. O relatório de performance anterior à separação server/client foi preservado como baseline local, sem equivaler a baseline de produto aprovado.

Admin usa contexto e navegação próprios. Suporte não vê corpo de conversas. Billing apresenta apenas Mercado Pago, sem preço ou método recorrente presumido; retorno não ativa assinatura. Contato não implica consentimento e o exemplo de consentimento opcional começa desmarcado. Canal/IA indisponíveis não fingem impedir o acesso visual às funções locais. Aprovação final de todas as rotas P0 do produto continua bloqueada pelo PRD ausente.

Sem .env real ou segredo; `.env.example` registra que não há credenciais necessárias. Não existe API externa integrada, então sandbox/prod, quotas e erros de provedores não são simulados como reais. Os mocks do catálogo se limitam a eventos de UI DEMO_ONLY em Storybook/testes. Nenhum mock de API ou dado identificável foi criado.
