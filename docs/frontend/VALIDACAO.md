# Validação — etapa 04

## Resultado e escopo

Aplicação venda-web Next.js 16.4.6/React 19.3.1/TypeScript strict, branch `frontend/etapa-04-site-login-onboarding`, base `7155bf0`. Site público, layouts auth/app, Inter local, temas, cliente gerado de OpenAPI, bridge OIDC, cookie HttpOnly, seleção/criação/edição de organização, memberships e onboarding retomável por dados reais da API. Backend, SQL, migrations, marca e fases anteriores preservados. Sem deploy, push, recursos AWS ou execução da etapa 05.

Arquitetura, PRD V01–V24, segurança/governança e referencias/venda-openapi.yaml continuam ausentes. Foi lido o contrato candidato da etapa 03 antes do código; o cliente foi gerado e regenerado para comparação idêntica. Não se declara compatibilidade canônica. A fase implementa a fundação disponível e deixa explícitos os bloqueios de produto/produção; não declara conclusão integral.

O GitHub conectado foi consultado novamente nesta etapa: a API retornou 404 “This repository is empty.” para ubuntufuture/vendaflow-web. A ausência das referências locais e essa resposta foram registradas em evidencias/referencias.json. Nenhuma credencial de produção foi consultada ou criada.

Cadastro e recuperação são telas de entrada no provedor OIDC, sem senha local, endpoint de reset inventado ou alegação de cadastro confirmado. Módulos comerciais mostram indisponibilidade, sem listas vazias ou gráficos falsos. Canal, consentimento por finalidade/canal, assinatura e entitlement nunca são inferidos da criação de organização. Documentos legais e preços não fornecidos permanecem pendentes, sem aceite fictício.

## Verificações executadas

Comandos na raiz do workspace; as evidências originais estão em evidencias/.

| Comando | Resultado / evidência |
| --- | --- |
| `npm run build:web` com ANALYZE=true | PASS, build otimizado, TypeScript, rotas e Proxy; analyzer client/nodejs/edge |
| `npm run typecheck:web` | PASS na implementação inicial; o build final também verifica TypeScript strict |
| `npm run test:web` / Vitest com reporter JSON | 16 testes de segurança/validação/transporte, sem falhas; unitarios.json |
| `npm run typecheck` e Vitest da raiz | PASS, 20 testes anteriores preservados; regressao-ui.json |
| `npm run build:storybook` | PASS, novas histórias incluídas; warnings Vite sobre diretivas use client e chunks de docs/axe, exclusivos da ferramenta |
| `npm run test:web:storybook` | Cinco PASS, renderização confirmada e zero violações axe; storybook.json |
| `npm run test:web:browser` | 123 PASS, zero FAIL; 37 verificações axe e 41 capturas; browser.json. Next + Nest + PostgreSQL real + simulador OIDC RSA/JWKS |
| `npm run contract:web` | PASS: cliente regenerado idêntico; contrato.json tem hashes e compatibilidade canônica false |
| `npm run smoke:web` | Nove PASS no build final; callback com Host injetado, bridge fechado, CSP, no-store, runtime sem analyzer e timeout SSR real; smoke.json |
| `npm audit --json` | Zero vulnerabilidades conhecidas na consulta registrada; npm-audit.json |
| `npm run measure:web` | Lighthouse de produção: 12 navegações, três por rota/perfil, relatórios comprimidos e lighthouse.json |
| `npm run verify:web` | Exit 0, 14 PASS; verificacao.json |
| `npm run verify:web -- --release` | Exit 1 esperado, 14 PASS e quatro FAIL por referências/IdP externo/contratos/RUM-auditoria assistiva pendentes; gate-release.json |

Browser cobre: público/auth desktop e mobile, reflow, Inter, tema dark, skip link/teclado, 404, diff visual, cookie Secure/HttpOnly/SameSite=Lax sem leitura por JS, sessão, vazio verdadeiro, validação Zod, criação/edição confirmadas no PostgreSQL, shell desktop/tablet/mobile, menu mobile por teclado, memberships, 403 viewer, A/B sem dados cruzados por URL, revogação de membership, CSRF/origem externa recusada, CSP/no-store, timeout real de transporte, logout normal e logout com API indisponível. Não se afirma teste assistivo com NVDA/VoiceOver ou todos os ataques ASVS.

O teste usa PostgreSQL 18.7 nativo Windows, com migration e role runtime da API sem superuser/bypass; não é pg-mem/PGlite. Identidades/organizações são DEMO_ONLY; senhas e chaves aleatórias existem apenas em memória/arquivo temporário de bootstrap descartado. O adapter local de testes permite até 240s de inicialização nesta máquina e limpa seu próprio cluster após encerrar o processo. Não altera limites produtivos da API nem desliga fsync/durabilidade. O IdP é um simulador de protocolo com assinatura real, não um provedor externo. HTTP loopback em Chrome não equivale a TLS real de produção.

Histórico preservado: primeiras rodadas excederam o timeout de 60s do initdb; o adapter local foi criado para não alterar o backend. Uma rodada teve argumento incorreto do harness ao construir a API e falhou também no teardown; o cluster específico foi encerrado manualmente. Um seletor confundiu feedback do formulário com o anunciador do Next e foi corrigido. A auditoria detectou espaçamento ausente no nome acessível do wordmark, corrigido. O primeiro smoke do Storybook exigiu contexto explícito do Playwright para axe. Relatórios históricos não são considerados PASS. O menu mobile foi revisado após inspeção visual, e o logout remove o cookie local mesmo sem confirmação remota.

O cenário de rede interrompida expôs espera sem término nas rodadas finais; mudar apenas o critério de navegação não resolveu. Foi implementado prazo explícito de 6s abrangendo headers e corpo, com abort e limite de resposta de 1MiB. Há testes para fetch que ignora abort, corpo HTTP interrompido e limite de bytes, além de smoke SSR com upstream sem resposta. Os relatórios de timeout anteriores foram preservados como FAIL.

## Segurança e disponibilidade

Nenhum DB driver, segredo OIDC ou chave de backend pertence ao app Next. Configuração privada e transporte ficam server-side. Consultas usam no-store e cookies selecionados; contexto de organização é explícito no path e revalidado pela API. O frontend não substitui autorização ou entitlement. Server Actions validam Origin e Zod; token CSRF é obtido server-side por /me. Idempotência preserva uma intenção ao reenviar o mesmo formulário. Não há URL arbitrária no BFF nem dados privados em storage do browser.

CSP tem nonce/strict-dynamic e sem unsafe-eval no build de produção; fontes e assets locais. Nonce torna as páginas dinâmicas: escolha explícita sujeita à reconciliação de arquitetura/performance. Logs da aplicação não incluem payload; Next pode registrar host/Origin na rejeição de Server Actions, como no teste negativo. Implantação exige governança/redação de logs de borda e proibição de query OIDC em access logs. O trace Playwright é exclusivamente público, encerrado antes do login para não armazenar cookie, code ou CSRF autenticados.

Falhas de integração não são transformadas em sucesso. Logout offline limpa o acesso neste navegador e informa revogação remota não confirmada; não inventa fila de revogação ou single logout do IdP. MFA interno/admin, secrets KMS, TLS, WAF, backups/DR, RUM externo e scanning CI dependem das camadas/provedores apropriados. Não há certificação ASVS nem liberação para produção.

## Performance e baseline

O relatório performance.json mede cinco navegações por rota em desktop 1440×1000, build produtivo, sessão aquecida no app, cache de assets aquecido e respostas privadas sem cache. São landing, login e app-shell com PostgreSQL real local; não há IA, pagamento ou rede externa. Percentis nearest-rank, amostra pequena. FCP/TTFB não são “primeiro conteúdo útil”; nenhuma garantia universal de um segundo.

| Rota | FCP p75 | FCP p95 | TTFB p75 |
| --- | --- | --- | --- |
| Landing | 120 ms | 188 ms | 31 ms |
| Entrar | 148 ms | 188 ms | 31,4 ms |
| App-shell DEMO_ONLY | 144 ms | 284 ms | 48,8 ms |

lighthouse.json contém CPU/Node/Chrome/settings completos e 12 navegações com cache/storage limpos: desktop preset oficial e mobile 390×844, RTT 150ms/down 1600Kbps/up 750Kbps/CPU 4× simulados. Não é borda regional nem device/rede de campo. Os p75/p95 são descritivos; com n=3 nearest-rank ambos podem coincidir com o máximo. Budgets laboratoriais por rota: LCP p75 ≤2500ms, CLS p75 ≤0,1. Bytes de JS e TBT são registrados sem confundir TBT com INP.

| Rota / perfil | LCP p75/p95 | CLS p75 | TBT p75 | JS transferido p75 |
| --- | --- | --- | --- | --- |
| Landing / desktop | 296,65 / 296,65 ms | 0,000037 | 38 ms | 145.719 bytes |
| Entrar / desktop | 251,89 / 251,89 ms | 0 | 34 ms | 144.465 bytes |
| Landing / mobile restrito | 896,96 / 896,96 ms | 0,002316 | 567 ms | 145.719 bytes |
| Entrar / mobile restrito | 795,18 / 795,18 ms | 0 | 439,05 ms | 144.465 bytes |

Os budgets locais de LCP/CLS passam. TBT mobile de 567/439ms ainda é risco para interatividade em CPU fraca; não se conclui que INP ≤200ms foi atingido. A rodada inicial antes da revisão do menu foi preservada, sem atribuir sua variação de TBT a uma otimização causal comprovada.

A instrumentação emite eventos locais venda:web-vital apenas com nome/valor/rating. O browser observa os eventos; não há transmissão para collector ou cookies analíticos. LCP/INP/CLS de campo p75 por segmento continuam pendentes. TBT em CPU/rede restritas deve ser acompanhado como risco de interatividade, mesmo quando FCP/LCP passam. Assets/gzip estão em assets.json e analyzer em bundle-analyzer/; a soma de arquivos não é tratada como transferência por rota.

## Marca e checklist

Board e tokens consultados; fonte Inter e paleta exata preservadas. Auditado visualmente: landing desktop, login mobile e onboarding/shell desktop e mobile; capturas restantes têm verificações automatizadas. Comparação lado a lado e diff de repetibilidade não equivalem a um baseline aprovado. Logo segue placeholder tipográfico autorizado; SVG e direção de arte pendentes. Ver FIDELIDADE.md.

| Critério | Estado |
| --- | --- |
| Branch isolada, frontend separado e nenhuma etapa 05 | PASS |
| Layouts public/auth/app, pt-BR/BRL, Inter e tokens | PASS local |
| Cliente OpenAPI gerado e tipado em uso real | PASS candidato |
| Sessão/cookie/CSRF, tenancy e onboarding reais em sandbox | PASS local; TLS/IdP externo pendentes |
| Loading/vazio/erro/403/404/timeout/sucesso | PASS no escopo disponível; estados comerciais bloqueados explícitos |
| A11y automatizada e teclado | PASS local; conformidade assistiva integral pendente |
| Pagespeed inicial e Web Vitals instrumentados | PASS laboratório; RUM de campo pendente |
| Nenhum segredo/DB no browser ou métricas fictícias | PASS local e inspeção de assets |
| Compatibilidade com PRD/OpenAPI canônicos | FAIL: referências ausentes |
| Cadastro/reset externos, documentos legais, billing/canal/consentimentos completos | FAIL para liberação: contratos/provedores ausentes |
| API/DB/migrations/admin/infra/gateway alterados | N/A: preservados/fora desta fase |
| Etapa integral liberada para produção | FAIL: bloqueios explícitos |

Próxima ação recomendada: reconciliar referências e contratos canônicos, validar IdP/TLS e fechar bloqueios legais/comerciais antes de liberação. A etapa seguinte não foi executada.
