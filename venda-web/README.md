# Venda Web — fundação frontend

Aplicação Next.js 16/React 19/TypeScript strict, separada de venda-api. Usa o package/lockfile da raiz para o ambiente local existente; não compartilha identidade ou dados com outro produto. Sem DB driver, segredo OIDC, gateway, sessão simulada ou mocks no runtime.

## Execução

Na raiz, `npm ci`, `npm run generate:web`, `npm run build:web`, `npm run start:web`. Desenvolvimento: `npm run dev:web`. Configure as variáveis de venda-web/.env.example no ambiente do processo ou venda-web/.env.local (não versionado); não use NEXT_PUBLIC para configuração privada. Origens devem ser HTTPS, sem path/query/credenciais. As telas públicas abrem sem serviços configurados; a área privada apresenta indisponibilidade.

O backend recebe API_ORIGIN e APP_ORIGIN com a mesma origem pública do frontend. Seu serviço interno é configurado exclusivamente em VENDA_API_INTERNAL_ORIGIN. O callback cadastrado no provedor deve ser a origem pública + `/v1/auth/callback`, exatamente. Login e callback atravessam um bridge de rotas fixas; cookies __Host- mantêm Secure/HttpOnly/SameSite=Lax/Path=/ e não recebem Domain. O callback encerra em `/app`. A rota UX `/auth/callback` é somente um alias para o callback efetivo. Não há senha gerenciada pelo frontend, token no localStorage, endpoint proxy arbitrário ou troca de URL por entrada do visitante.

As páginas de cadastro e recuperação abrem o fluxo OIDC existente. A criação de identidade e a recuperação devem ser habilitadas e validadas pelo provedor; nenhum endpoint ou capacidade de cadastro/reset foi inventado. Logout revoga a sessão local no backend; se o backend falhar, remove o cookie deste navegador e informa que a revogação remota não foi confirmada. Single logout do provedor não está contratado.

## Fronteiras e renderização

Layouts public/auth/workspace e consultas são Server Components. O cliente gerado do contrato candidato fica em lib/api.generated.ts e é usado por openapi-fetch no servidor. Ilhas cliente: formulário Zod/useActionState, tema e instrumentação Web Vitals. O formulário chama Server Action com validação de origem, UUID/idempotência e Zod; a API revalida DTO, membership, role, CSRF e RLS. O frontend nunca concede entitlement. CSRF obtido por /me não é serializado para o browser.

O cache React é apenas da requisição de renderização. Fetch privado usa no-store, timeout, redirect:error e cookies estritamente selecionados. Contexto de organização fica no path /app/o/:organizationId; a API valida membership a cada consulta. Não há cache global de organizações nem estado privado em storage do browser. Login/callback são os únicos endpoints encaminhados pelo bridge. Server Actions não aceitam URL de backend.

CSP usa nonce por requisição e strict-dynamic, sem unsafe-eval em produção. Esse controle torna as páginas dinâmicas, inclusive a landing; assets versionados continuam estáticos. A escolha e seu custo devem ser reconciliados com arquitetura e budgets canônicos. O bundle analyzer só é importado com ANALYZE=true, para não exigir a ferramenta de desenvolvimento no runtime normal. HSTS, TLS, proxy confiável, logs de borda sem query OIDC, WAF e limitação distribuída permanecem requisitos de implantação. Estilos inline são permitidos para compatibilidade com o runtime Next; scripts inline exigem nonce.

Temas usam somente os tokens existentes. Inter latina é local via next/font/local, sem requisição Google. O wordmark é placeholder tipográfico autorizado: SVG oficial e aprovação de arte continuam pendentes. Não há screenshots de referência ou métricas fictícias no bundle da aplicação.

## Testes e limites

`npm run typecheck:web`, `npm run test:web`, `npm run test:web:browser`, `npm run build:storybook`. O teste de browser exige primeiro o backend compilado com testes (`cd venda-api`, `npx tsc -p tsconfig.json`), Google Chrome local e binários embedded-postgres já instalados. Executa Next em build de produção, API Nest real, PostgreSQL real e um simulador OIDC assinado DEMO_ONLY. Cluster e serviços são descartáveis, credenciais só em memória. VENDA_WEB_LOCAL_TEST=true permite transporte HTTP somente loopback no harness; nunca habilitar em implantação. Isso não equivale a teste de IdP externo ou TLS real. Rode a suíte sem builds concorrentes nesta máquina.

Instrumentação Web Vitals emite evento local `venda:web-vital` contendo apenas nome/valor/rating; não transmite telemetria nem coleta identidade, URL ou conteúdo. RUM de campo depende de contrato e governança do collector. FCP/Lighthouse laboratoriais não são prova de INP de campo ou de primeiro conteúdo útil em um segundo.

Os módulos comerciais têm indisponibilidade explícita porque seus contratos não existem no workspace. Não são apresentados como listas vazias verificadas. Apenas organizações, memberships e estado de sessão usam dados reais. Documentos jurídicos, preços, cadastro/reset do provedor, WhatsApp, consentimento por finalidade/canal, cobrança e reconciliação seguem bloqueados. Nenhum aceite fictício é coletado.

Detalhes, cobertura de rotas, backlog e evidências em ../docs/frontend/.
