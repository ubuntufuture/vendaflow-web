# Comparação e checklist de fidelidade

Referência: `branding/brandboard.png`, preservado byte a byte do ZIP recebido. Implementação comparativa: `/identidade` no sandbox. [Captura lado a lado](evidencias/telas/comparacao-brandboard.png).

| Elemento | Verificação | Resultado |
| --- | --- | --- |
| Nome | Venda Flow AI em todos os shells e na assinatura tipográfica | PASS |
| Tagline | “Mais conversas. Mais negócios.” sem alteração de texto | PASS |
| Família | Inter local carregada no navegador, sem Plus Jakarta Sans | PASS |
| Paleta | Valores exatos do pedido e aliases light/dark sem cor adicional | PASS |
| Contraste da ação | Texto Obsidiana sobre Coral em vez de branco/Coral do export | PASS; diferença intencional por acessibilidade |
| Estados | Texto e ícones explicam sucesso/erro/pendência sem nova cor | PASS |
| Logo | Apenas placeholder tipográfico; nenhum SVG falso, recorte ou símbolo aproximado | PASS para fallback autorizado; SVG oficial pendente |
| Superfícies | Navegação Obsidiana, ação Coral, canvas Marfim e painéis Branco no modo claro | PASS |
| Dark | Mesmos cinco primitivos; bordas em vez de novos tons | PASS técnico; direção de arte produtiva pendente |
| Conteúdo | Sem números de vendas, preços, pessoas, depoimentos ou parceiros fictícios nas telas | PASS |
| PNG de referência | Aparece apenas na página comparativa do sandbox, identificado como board recebido | PASS; os números ilustrativos do PNG não foram transcritos para a UI |
| Igualdade pixel a pixel com o board | O board é composição de identidade e mockups, não screenshot da rota atual | N/A; não constitui baseline de regressão aprovado |

## Escopo da inspeção visual

Inspecionados individualmente: brandboard original; Conversas desktop e mobile, incluindo dark desktop (APP03); Visão geral técnica admin desktop (ADM02); Faturamento mobile (APP16); landing mobile (PUB01); criar automação mobile (APP12); comparação de identidade. Foram conferidos nome, Inter, proporção de hierarquia, superfícies, ausência de texto cortado relevante e clareza do estado.

As 39 telas candidatas tiveram capturas desktop/mobile e verificações automatizadas de semântica, contraste axe, Inter e overflow. Tablet foi verificado em APP03/APP16/ADM03; reflow 320 em PUB01/APP03/APP16/ADM02. Não se declara auditoria manual individual de todas as 98 capturas, nem teste assistivo completo com NVDA/VoiceOver.

## Diff executado

`scripts/test-ui-browser.mjs` compara duas capturas locais de APP03 desktop com fontes prontas e animação reduzida. A rodada final registrou zero pixels alterados, arquivo [diff-repetibilidade.png](evidencias/diff-repetibilidade.png). Isso prova repetibilidade naquela condição, não equivalência com arte aprovada nem ausência de regressões futuras. O PNG comparativo e este checklist documentam as diferenças perante o board; um baseline de telas aprovado ainda precisa ser definido.
