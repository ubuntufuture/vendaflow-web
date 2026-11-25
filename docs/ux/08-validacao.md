# Verificação e critérios de conclusão

## Escopo do que foi verificado

Esta é uma especificação UX em repositório inicialmente vazio. `node scripts/verify-ux.mjs` verifica consistência do catálogo, presença das famílias de wireframe, estados obrigatórios, papéis, fontes, hashes e evidência de contraste. Não executa aplicação nem afirma conformidade de backend, UI, WCAG ou performance.

Execução real em 21/11/2026, Node v24.19.0, Windows/PowerShell:

| Comando | Resultado observado | Evidência |
| --- | --- | --- |
| `node scripts/catalog-ux.mjs` | Exit 0; 39 rotas candidatas e 40 exports classificados | routes.json e fontes.json |
| `node scripts/verify-ux.mjs` | Exit 0; 8 verificações PASS; 37/37 P0 candidatas com estados; 78 arquivos com hashes válidos | evidencias/verificacao-documental.json |
| `node scripts/verify-ux.mjs --release` | Exit 1; 8 PASS e 2 FAIL por referências/cobertura PRD ausentes | evidencias/gate-release.json |

Contraste calculado: branco/Coral 2,830:1 (falha texto normal e grande); Obsidiana/Coral 6,826:1 (passa texto normal AA); Obsidiana/Marfim 18,519:1; Cinza Claro/branco 1,227:1 (inadequado como único indicador essencial). O cálculo não audita renderização, transparência ou todas as combinações das telas.

Verificação de encoding dos oito Markdown: nenhum caractere U+FFFD encontrado. Foram entregues sete blocos Mermaid (sitemap e seis fluxos); sem renderização gráfica validada. Git confirmou a branch solicitada, sem commits prévios e sem alterações em código de produto existente.

`node scripts/verify-ux.mjs --release` acrescenta o gate de referências obrigatórias; deve falhar enquanto faltarem PRD, arquitetura, segurança, OpenAPI e branding canônico. Um arquivo apenas com nome esperado não é suficiente para aprovação: o script verifica existência, a revisão de conteúdo e cobertura V01–V24 permanece manual. Os relatórios JSON guardam checks, pendências e saída esperada sem ocultar falhas.

## Plano de testes aplicáveis

| Verificação | Aplicabilidade e estado |
| --- | --- |
| Integridade documental e referência dos exports | Executada via Node sem dependências externas; resultados JSON em evidencias |
| Contraste entre cores sólidas do brandboard | Executado numericamente; não prova contraste de todas as telas |
| Revisão visual de marca | Brandboard, conversa desktop variante 1 e faturamento mobile inspecionados; demais telas sem auditoria visual individual |
| Renderização de Mermaid | Blocos de origem entregues; renderizador não disponível/configurado, verificação visual pendente |
| Unitário/integrado/contrato de aplicação | N/A neste repositório sem implementação; exigidos quando houver código de produto |
| Segurança/RLS/PostgreSQL real | N/A à entrega documental; não executado, não há DB ou API; pendência obrigatória da implementação |
| SDK Mercado Pago/Meta sandbox | Não executado; sem ambiente/configuração, sem inventar credenciais |
| axe/Playwright/teclado/leitor de tela | Não executado; não existe aplicação/protótipo funcional para afirmar resultado |
| Lighthouse/bundle/OTel/RUM/carga | Não executado; sem runtime ou ambiente medível |

## Performance e protocolo de baseline proposto

Nenhuma latência, LCP, INP, CLS, percentil, tamanho de bundle ou custo de produção foi medido. Não há baseline numérica e a meta “menos de 1 segundo” não foi atingida por evidência. O ZIP não fornece benchmark confiável e suas métricas não são resultados do produto.

Quando a aplicação for autorizada: medir site público, shell autenticado, lista/detalhe de conversa, contatos, vendas e faturamento em staging isolado. Definir “primeiro conteúdo útil” como título/contexto mais primeira ação utilizável, sem contar skeleton como conteúdo útil. Transição frequente mede clique até conteúdo confirmado utilizável, separada do tempo de integração externa.

Protocolo a aprovar: desktop moderno com navegador e versão registrados, viewport 1440×900, teste brasileiro em São Paulo e borda regional; mobile de faixa intermediária identificado, 390×844; registrar CPU/RAM/OS e localização efetivos, não apenas emulação. Laboratório com boa rede proposta de 50 Mbps/10 Mbps/RTT 30 ms e rede restrita de 1,6 Mbps/750 Kbps/RTT 150 ms; condições são perfis propostos, não medições. Executar público com cache frio/quente separado; shell com sessão aquecida e cache privado do mesmo tenant; repetir séries suficientes para percentis de laboratório e guardar traces/raw results. Não chamar p75 de laboratório de RUM.

Meta aspiracional: primeiro conteúdo útil/transição frequente ≤1,0 s p75 apenas no perfil desktop bom e sessão/cache descritos. RUM por rota, mobile/desktop, rede e contexto: LCP ≤2,5 s p75, INP ≤200 ms p75, CLS ≤0,1 p75. Publicar p75 e p95, amostra e período; não alegar ganho sem baseline. Na rede restrita reportar limite observado.

APIs locais críticas: meta p95 GET ≤300 ms e POST síncrono ≤500 ms sem chamadas externas. Perfil inicial proposto para aprovação: 50 usuários virtuais, rampa de 5 min e janela estável de 15 min, mistura 80% leitura/20% escrita, dataset sintético DEMO_ONLY de 10 tenants com 10 mil contatos e 100 mil mensagens cada; tenant quente e frio separados. Não é capacidade contratada nem carga executada. Rever perfil com escala real prevista e registrar concorrência, throughput, p95, erros, timeouts, DB/CPU e isolamento. Nenhum número sintético entra na UI de produção.

Gates futuros por rota: Lighthouse CI + traces Playwright + bundle analyzer para regressões de carregamento; OpenTelemetry para fronteiras locais/externas; RUM sem conteúdo pessoal. Orçamento inicial de JS/bytes por rota só após baseline; não inventar limite supostamente validado. Exigir comparação sob perfil idêntico, com cache e variação registrados. Regressão de meta ou isolamento bloqueia release; equivalência visual não substitui medição.

Diretrizes a implementar depois: RSC/server-first, pré-render/streaming conforme conteúdo, carregamento por rota e Suspense regional, fontes Inter otimizadas, assets versionados em CDN, next/image adequado, tabelas paginadas/virtualizadas com alternativa acessível, prefetch seletivo. Nenhum dashboard inteiro para exibir skeleton. Integrações/IA/pagamentos não bloqueiam primeira pintura. Cache privado inclui tenant e escopo de autorização, invalida em troca/revogação e não compartilha chave entre organizações.

## Impactos revisados

Tenant isolation: não existe código alterado; a proposta exige limpeza de contexto e checagem por objeto. Billing/entitlements: assinatura não deriva de botão/retorno; regras ainda dependem do contrato. Consentimento: granular por finalidade/canal e revalidado no envio. Canal: falha externa permite trabalho local autorizado, sem afirmar envio/entrega. Marca: Inter e paleta do board orientam especificação; logo/tokens canônicos e auditagem de todas as telas pendentes.

## Checklist de aceite

| Critério | Resultado nesta entrega |
| --- | --- |
| Branch própria e somente etapa UX | PASS — branch ux/etapa-01-pesquisa-jornadas-ia, sem implementação de produto |
| Documentos obrigatórios lidos antes de código | FAIL — ausentes; nenhuma implementação de produto iniciada |
| Sitemap público/app/admin e catálogo candidato íntegro | PASS documental — ver contagem calculada no relatório |
| 100% das rotas P0 do PRD catalogadas | FAIL — denominador desconhecido sem PRD; não substituir por catálogo candidato |
| Jornadas por papel, JTBD e hipóteses explícitas | PASS documental; pesquisa com clientes não executada |
| Fluxos Mermaid e wireframes por tela/estado | PASS de presença; renderização Mermaid pendente |
| Fluxos críticos com loading/vazio/erro/negado/timeout/sucesso | PASS de especificação E0–E5 em todas as rotas candidatas; runtime não verificado |
| UX sem dados não verificados | PASS na especificação: indisponível/desconhecido; aplicação inexistente. ZIP isolado contém conteúdo não aprovado |
| Mapa de permissões, consentimento, cobrança e reconciliação | PASS documental; aprovação dos contratos pendente |
| WCAG 2.2 AA e guias desktop/tablet/mobile | PASS de critérios definidos; conformidade executável NÃO demonstrada |
| Compatibilidade API/DB | N/A — nenhum contrato, endpoint ou DB alterado; OpenAPI ausente impede análise completa |
| Testes e métricas reportados sem simulação | PASS — relatórios documentais reais; runtime/sandbox não executados |
| Fidelidade integral da UI contra branding canônico | FAIL — branding canônico e logo original ausentes; não há UI implementada |
| Conclusão integral da etapa | FAIL — requer referências e validações listadas; não avançar automaticamente |

Próxima ação recomendada dentro desta etapa: fornecer/reconciliar PRD V01–V24, OpenAPI, arquitetura, segurança, tokens e logo canônicos; revisar prioridades e fechar cobertura rastreável. Só após instrução explícita iniciar protótipo/implementação da próxima etapa.
