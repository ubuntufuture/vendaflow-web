# Performance do catálogo UI

Laboratório local em 2026-11-21T17:19:53.199Z, Node v24.19.0, AMD PRO A10-9700 R7, 10 COMPUTE CORES 4C+6G    . São 30 navegações Lighthouse, cinco por rota/perfil. Desktop usa o preset oficial; mobile/rede restrita usa 390×844, RTT simulado 150 ms, down 1600 Kbps, up 750 Kbps, CPU 4×. Origem loopback, cache/storage limpos pelo Lighthouse. Não existe sessão autenticada nem integração externa. Configurações, versões e condições completas estão em [performance.json](evidencias/performance.json); relatórios originais comprimidos em evidencias/lighthouse.

Percentis por interpolação linear, amostra pequena descritiva. FCP/LCP/TBT em ms; CLS adimensional. FCP não substitui primeiro conteúdo útil; TBT não substitui INP. Nenhum dado abaixo comprova RUM ou o desempenho da plataforma produtiva.

| Rota | Perfil | n | FCP p75 | FCP p95 | LCP p75 | LCP p95 | CLS p75 | TBT p75 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PUB01 | desktop | 5 | 252.181 | 253.583 | 252.181 | 253.583 | 0.002 | 44 |
| APP03 | desktop | 5 | 273.249 | 276.524 | 273.249 | 276.524 | 0.017 | 38 |
| ADM02 | desktop | 5 | 259.545 | 264.865 | 259.545 | 264.865 | 0 | 36.5 |
| PUB01 | mobile-rede-restrita | 5 | 909.782 | 912.306 | 909.782 | 912.306 | 0 | 393 |
| APP03 | mobile-rede-restrita | 5 | 911.266 | 911.718 | 911.266 | 911.718 | 0.002 | 443.084 |
| ADM02 | mobile-rede-restrita | 5 | 914.645 | 923.369 | 914.645 | 923.369 | 0 | 396 |

## Comparação local antes e depois da separação server/client

A baseline foi medida na mesma máquina, com as mesmas configurações e cinco amostras por grupo, antes da separação das telas em Server Components. Não é baseline produtiva aprovada; diferenças pequenas podem ser variação de laboratório.

| Rota | Perfil | TBT p75 antes em ms | TBT p75 final em ms |
| --- | --- | --- | --- |
| PUB01 | desktop | 32 | 44 |
| APP03 | desktop | 51.5 | 38 |
| ADM02 | desktop | 62 | 36.5 |
| PUB01 | mobile-rede-restrita | 420 | 393 |
| APP03 | mobile-rede-restrita | 359.5 | 443.084 |
| ADM02 | mobile-rede-restrita | 342 | 396 |

## Limites e gates

Budgets laboratoriais por rota: LCP p75 ≤2500 ms e CLS p75 ≤0,1, verificados por verify-ui.mjs. A meta aspiracional de primeiro conteúdo útil ≤1000 ms não foi verificada com essa métrica. INP real, RUM por segmento, APIs p95, carga/dataset e borda regional são N/A neste sandbox e permanecem pendentes para o produto. TBT mobile deve ser acompanhado; não representa latência de teclado medida com usuários.

O analyzer oficial do Next gerou [client.html](evidencias/bundle-analyzer/client.html), nodejs.html e edge.html; edge não tem bundle executável neste export. Inventário de bytes/gzip de todos os assets está em performance.json, sem confundir soma de arquivos com transferência por rota. Storybook tem chunks grandes de documentação/axe, exclusivos da ferramenta e ausentes do entrypoint de componentes.
