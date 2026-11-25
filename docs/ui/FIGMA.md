# Especificação para biblioteca Figma

Documento de handoff. Não foi criado ou editado arquivo Figma remoto; conexão de Figma não foi usada. A fonte única é `branding/tokens.json`; CSS é gerado por `npm run tokens`. Não importar o DESIGN.md conflitante do ZIP como fonte de verdade.

## Estrutura da biblioteca

Páginas sugeridas: Fundamentos, Componentes, Estados, Telas do cliente, Console administrativo, Comparação de marca. Usar Inter e nomes em pt-BR. Criar coleção `Venda Flow AI / Primitivos` com os cinco valores exatos; coleção `Semânticos` com modos light/dark e aliases conforme `semantic` do JSON. Não expandir paleta com hover vermelho/verde; hover usa sublinhado e a mesma cor.

| Grupo | Configuração |
| --- | --- |
| Cores | Primitivos primary/foreground/background/surface/muted; aliases canvas/panel/text/text-secondary/border/border-subtle/action/on-action/focus/navigation/on-navigation/selected/on-selected |
| Texto | caption/label/body/title/heading/display com tamanho/linha/peso do JSON; desativar substituição automática por outra família |
| Dimensões | Espaço 4–64 px; radius control 8, panel 16, dialog 24; stroke 1/2 px |
| Layout | Frames 1440×1000, 1024×768, 390×844 e reflow 320; auto layout e constraints sem largura fixa em conteúdo principal |
| Elevação | Borda e deslocamento da paleta, sem efeito com cor adicional |
| Motion | 120/180 ms e variante reduzida sem animação; explicitar no handoff |

## Propriedades dos componentes

Button: variant primary/secondary/quiet; state default/focus/disabled/busy. Field: label obrigatório, hint opcional, error opcional, required, disabled, read-only. Badge: neutral/attention/success/error, com texto e ícone. Modal: título, conteúdo, ações e foco inicial; variantes aberto/fechado. Toast: success/error com dispensa manual; exemplos rotulados DEMO_ONLY. Estado de região: loading/empty/error/forbidden/timeout/success/stale.

Separar propriedades puramente visuais de estados autoritativos do servidor. Não desenhar “Ativo”, “Pago”, “Conectado” ou “Entregue” sem explicitar a condição de confirmação no handoff. Nas telas finais do catálogo, os dados permanecem indisponíveis porque nenhum backend está conectado.

Usar variantes de componentes, sem detached instances para corrigir contrastes caso a caso. Nomear layers pelo papel semântico, não pela cor aparente. As tabelas usam caption e cabeçalhos; o arquivo de design precisa anotar a ordem DOM e comportamento em teclado que não aparece no frame.

## Revisão e comparação

PNG de origem: `branding/brandboard.png`. Página comparativa implementada em `/identidade`; captura e análise em `docs/ui/evidencias`. Não existe baseline de telas aprovado; o board mistura identidade, mockup e métricas ilustrativas e não é screenshot de uma rota. Portanto um diff pixel a pixel entre board e app não mede fidelidade. A comparação válida nesta entrega verifica paleta, Inter, nome, tagline, hierarquia, superfícies e ausência de conteúdo fictício. O diff automatizado adicional mede repetibilidade da mesma tela local, sem se apresentar como aprovação de arte.

Checklist de direção de arte: cinco cores intactas; Inter carregada; Coral com texto Obsidiana; nome/tagline exatos; logo original ainda pendente; nenhum recorte do board como logo; nenhum retrato/depoimento/métrica copiado; dark restrito à mesma paleta; desktop/mobile preservam prioridade de conteúdo. Direção de arte deve validar placeholder, layout final e dark antes de liberar produção.
