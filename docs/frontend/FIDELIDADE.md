# Fidelidade visual — etapa 04

Referência consultada: branding/brandboard.png, recebida no ZIP e preservada. Tokens existentes mantidos exatamente: primary #FF6A4D, foreground #0B0E14, background #FFF9F6, surface #FFFFFF, muted #E6E8EC. Inter local via next/font/local, pt-BR e tagline “Mais conversas. Mais negócios.”.

## Comparação e limites

[Comparação lado a lado](evidencias/comparacao-brandboard.png) mostra o board e a landing implementada. O board é uma composição de marca; não é um baseline aprovado de screenshot. Não se declara equivalência pixel a pixel com a composição. Os gráficos e os números ilustrativos do board não foram copiados para páginas reais. O board não é servido pelo app produtivo.

O wordmark usa apenas tipografia Inter e o destaque AI da etapa UI. Não foi inventado SVG, recortado o símbolo do PNG ou fingida aprovação do vetor. Logo oficial e aprovação da direção de arte permanecem pendentes.

Texto Obsidiana sobre Coral preserva legibilidade; não se usa texto branco/Coral. Temas dark mantêm os mesmos primitivos e usam bordas. Nenhum gradiente cromático, foto de estoque, mascote ou marca de outro produto. O diagrama da landing representa etapas conceituais, sem pessoas, dados comerciais ou números.

## Auditoria e evidências

Inspeção visual manual: landing desktop, login mobile e shell/onboarding desktop e mobile, comparados à paleta, Inter, nome e hierarquia do brandboard. O menu mobile foi recolhido após essa inspeção para priorizar contexto e conteúdo. As demais capturas e verificações automatizadas estão enumeradas em evidencias/browser.json. Não se afirma inspeção manual individual de todas as capturas.

O teste executa diff de duas capturas da mesma landing com fontes prontas e animações reduzidas; salva diff-repetibilidade.png. Isso testa estabilidade local, não aprovação de design nem impossibilidade de regressão. Um baseline aprovado por rota continua pendente.

Desktop: navegação horizontal pública; app com sidebar e conteúdo principal. Tablet: cards em duas colunas e áreas responsivas. Mobile: navegação quebra em linhas sem esconder acesso; menu nativo details é recolhível; conteúdo prioriza contexto, título, estado e ação. Formulários e botões mantêm alvo mínimo de 44px e foco visível; movimento reduzido é respeitado.

Dados identificados como DEMO_ONLY aparecem somente em capturas de teste/Storybook. Os formulários e as listas da aplicação não incluem fixtures nem defaults de organizações fictícias. Estados indisponíveis não são apresentados como lista vazia confirmada.
