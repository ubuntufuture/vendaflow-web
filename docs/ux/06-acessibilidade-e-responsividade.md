# Acessibilidade e responsividade

## Contrato de experiência WCAG 2.2 AA

Meta de conformidade, não certificação. A [recomendação WCAG 2.2](https://www.w3.org/TR/WCAG22/) é a fonte normativa para os critérios abaixo. Validar todos os critérios A/AA aplicáveis no produto final; esta lista orienta os fluxos críticos e não substitui avaliação completa.

| Critérios | Comportamento exigido e prova futura |
| --- | --- |
| 1.1.1; 1.3.1–1.3.2 | Logo com alternativa; ícones decorativos ocultos; landmarks, títulos e tabelas semânticas; leitura coerente em todos os estados |
| 1.4.1; 1.4.3; 1.4.11 | Status com texto/ícone além de cor; texto normal ≥4,5:1, grande ≥3:1; componentes/indicadores essenciais ≥3:1 onde aplicável |
| 1.4.4; 1.4.10; 1.4.12 | Zoom 200%, reflow a 320 CSS px, espaçamento de texto sem corte; não usar user-scalable=no; tabelas extensas com alternativa adequada |
| 2.1.1–2.1.2; 2.4.3; 2.4.7; 2.4.11 | Todos os controles por teclado, sem armadilha; foco visível, lógico e não ocultado por composer, toast ou navegação fixa |
| 2.2.1; 2.2.2 | Aviso de sessão quando aplicável; pausa de atualizações que prejudiquem leitura; nenhuma rolagem forçada por nova mensagem |
| 2.4.1–2.4.2; 2.4.6 | Pular navegação; título da página e headings específicos; link identifica destino |
| 2.5.3; 2.5.7; 2.5.8 | Nome acessível contém rótulo visível; alternativa a drag; alvo mínimo AA de 24 CSS px ou espaçamento/exceção válida. Meta de produto 44×44 px para toque |
| 3.1.1–3.1.2; 3.2.1–3.2.2 | lang pt-BR; mudança de idioma sinalizada quando relevante; foco/seleção não envia nem navega inesperadamente |
| 3.3.1–3.3.4; 3.3.7–3.3.8 | Erro associado ao campo e resumo; revisão antes de compromisso financeiro; evitar redigitação; autenticação acessível e gerenciadores permitidos |
| 4.1.2–4.1.3 | Nome/papel/valor em controles; live region moderada para resultados e status; alert somente para falha que exige atenção imediata |

Atualização de conversa anuncia contagem/estado sem ler dados pessoais automaticamente. Usuário escolhe ler nova mensagem. `aria-live` não repete histórico completo. Virtualização preserva navegação e posição, com paginação alternativa acessível. Reduzir animação com prefers-reduced-motion. Modal prende foco apenas enquanto aberto e restaura ao acionador; Escape não descarta edição silenciosamente.

## Fluxos de teclado

| Fluxo | Sequência e foco esperado |
| --- | --- |
| Navegação | Tab no link pular → conteúdo → título → filtros → lista → ações. Navegação atual com aria-current; mudança de rota foca heading sem prender teclado |
| Conversa | Tab busca → filtro → link da conversa → histórico → composer → anexar/modelo → enviar. Enter no textarea insere linha; envio por botão explícito. Atalho opcional só se configurável e documentado |
| Transferência | Abrir menu com Enter/Espaço → setas nas opções conforme padrão semântico → escolher responsável → confirmar → retorno ao acionador e anúncio do resultado |
| Oportunidade | Focar cartão/link → abrir → botão “Mover para etapa” → selecionar → confirmar → anúncio da etapa. Arraste nunca é necessário |
| Contato/consentimento | Abrir detalhe → finalidade/canal → ação revogar → resumo do efeito → confirmar/cancelar. Erro foca resumo com links para campos |
| Automação | Percorrer passos por Tab; gatilhos/ações editáveis em formulário/lista ordenada, sem canvas obrigatório; revisar escopo → confirmar publicação |
| Cobrança | Abrir detalhes → revisar preço/recorrência → confirmar ida ao Mercado Pago → retorno com foco em estado de confirmação. Não focar “pagar novamente” automaticamente |
| Admin | Pular navegação → busca mínima → motivo → diagnóstico → ação autorizada. MFA no provedor deve permitir mecanismos acessíveis |
| Drawer/modal | Foco inicial em heading ou primeiro campo conforme tarefa → Tab/Shift+Tab contidos → Escape pede decisão se edição suja → fechar restaura foco |

Sem atalhos globais de uma letra ativos por padrão. Ordenar tabulação pela ordem DOM, sem tabindex positivo. Erro não apaga formulário; validação não ocorre a cada tecla com anúncio excessivo. Campos obrigatórios descritos, placeholder não substitui label.

## Guias por viewport

Breakpoints propostos a partir de DESIGN.md: desktop ≥1200 px, tablet 768–1199 px, mobile <768 px. Usar largura disponível e reflow, não detecção de aparelho. Verificar 1440, 1024, 768, 390 e 320 CSS px, retrato/paisagem e zoom. Tablet não tem export próprio: validar protótipo posterior.

| Conteúdo | Desktop | Tablet | Mobile e prioridade |
| --- | --- | --- | --- |
| Shell cliente | Sidebar 260 px, margem 24, grid 12 colunas | Sidebar recolhível 72 px, margem 16, grid 8 | Menu acessível; navegação curta com rótulos; margem 16, grid 4; área segura e teclado não cobrem CTA |
| Conversas | Lista + thread; contexto sob demanda | Lista + thread; drawer de contato | Uma região por vez: lista → thread → contato. Destinatário, estado e composer precedem IA e metadados |
| Início | Próximas ações antes de métricas | Fila e tarefas antes de gráficos | Pendência acionável primeiro; ocultar apresentação secundária, preservar acesso aos dados |
| Contatos/tarefas | Tabela semântica e detalhe | Colunas essenciais e drawer | Lista com nome mínimo, estado e ação; campos adicionais em detalhe; filtros em diálogo |
| Funil | Quadro com opção lista | Lista ou quadro rolável identificado | Lista por etapa por padrão; não exigir arraste horizontal para completar tarefa |
| Automações | Editor sequencial e resumo lateral | Resumo em seção recolhível | Passos lineares; validar e revisar antes de publicar; mesma capacidade segura |
| Faturamento | Estado e compromisso antes do histórico | Mesma ordem | Estado → valor/recorrência → próxima ação → histórico. Nenhum termo essencial escondido |
| Relatórios | Resumo + gráfico + tabela equivalente | Resumo e consulta sob demanda | Período/fonte antes do resultado; tabela/lista equivalente; sem minigráfico ilegível |
| Admin | Diagnóstico denso com escopo explícito | Colunas essenciais | Consulta e triagem em prioridade; ações críticas só com revisão integral, sem restringir acessibilidade por tamanho |

Priorizar identificação do contexto, bloqueio relevante e próxima ação, depois dados necessários à decisão, por último visualização analítica/IA. Colapso não remove condição financeira, erro ou ação de recuperação. Foco não fica em conteúdo oculto após resize. Espaçamento base 8/16/24/32 px, Inter e hierarquia consistentes; tokens ainda pendentes.

## Contraste da marca

Calcular contraste WCAG sobre cores sólidas da referência; não declarar conformidade de screenshot ou da aplicação. Branco sobre Coral #FF6A4D é candidato problemático para texto normal. Preferir Obsidiana já existente sobre Coral caso o cálculo confirme contraste; não inventar nova paleta. Borda Cinza Claro em branco não deve ser única indicação essencial de um campo; foco e limite essencial precisam contraste suficiente. Resultados reproduzíveis ficam em evidencias/contraste.json.

Avaliação futura: axe em cada rota/estado, teclado completo em navegador, NVDA/Firefox e VoiceOver/Safari quando disponíveis, zoom/reflow e testes humanos com consentimento. Ferramenta automática não prova WCAG integral. Não executados nesta fase sem aplicação.
