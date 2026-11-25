import fs from "node:fs";
import path from "node:path";
const root = process.cwd(),
  dir = path.join(root, "docs/auditoria/2026-11-23"),
  evidence = path.join(dir, "evidencias");
const read = (p) => JSON.parse(fs.readFileSync(path.join(evidence, p), "utf8"));
const final = fs.existsSync(
  path.join(evidence, "integracao-final/browser.json"),
)
  ? read("integracao-final/browser.json")
  : null;
const initial = read("integracao-inicial/browser.json");
const preview = fs.existsSync(path.join(evidence, "preview.json"))
  ? read("preview.json")
  : null;
const commands = read("comandos.json");
const web = read("unitarios-web.json"),
  ui = read("regressao-ui.json");
const dependencyAudit = (name) =>
  JSON.parse(
    fs
      .readFileSync(path.join(evidence, `npm-audit-${name}.json`), "utf8")
      .replace(/^\uFEFF/, ""),
  ).metadata.vulnerabilities;
const dependencies = {
  web: dependencyAudit("web"),
  api: dependencyAudit("api"),
};
const uiActivationPath = path.join(root, "docs/ui-ativacao/verificacao.json");
const uiActivation = fs.existsSync(uiActivationPath)
  ? JSON.parse(fs.readFileSync(uiActivationPath, "utf8"))
  : null;
const missing = [
  "referencias/00_ARQUITETURA_GERAL.md",
  "referencias/03_SEGURANCA_E_GOVERNANCA.md",
  "referencias/venda-openapi.yaml",
].filter((p) => !fs.existsSync(path.join(root, p)));
const capabilities = [
  [
    "Site público",
    "PARCIAL",
    "Landing e navegação funcionam. Catálogo de planos/preços e documentos jurídicos não estão disponíveis.",
  ],
  [
    "Login e sessão",
    "LOCAL_OK / EXTERNO_NAO_VALIDADO",
    "Fluxo OIDC/PKCE/JWS, cookie HttpOnly/Secure/SameSite, CSRF e logout testados com IdP local assinado. Nenhum IdP externo foi validado.",
  ],
  [
    "Cadastro e recuperação de acesso",
    "PARCIAL",
    "Telas de encaminhamento ao provedor; sem confirmação de cadastro/reset em provedor real.",
  ],
  [
    "Organizações e onboarding inicial",
    "LOCAL_OK",
    "Criar, selecionar, consultar e atualizar nome/fuso; pt-BR/BRL; persistência PostgreSQL real. Não conclui ativação de canal ou assinatura.",
  ],
  [
    "Tenancy e autorização",
    "LOCAL_OK",
    "Roles owner/admin/manager/agent/viewer/billing, membership e RLS FORCE; provas de isolamento A/B, viewer 403, idempotência e revogação.",
  ],
  [
    "Equipe",
    "PARCIAL",
    "API gerencia memberships e UI consulta acessos. Sem convites por e-mail, nomes/e-mails ou gestão completa pela interface. Lista limitada a 100.",
  ],
  [
    "Atendimento e conversas",
    "NAO_IMPLEMENTADO",
    "UI de três colunas ativa, com filtros, compositor de rascunho e contexto. Sem API de conversas, fila operacional, histórico, envio, atribuição ou resolução.",
  ],
  [
    "WhatsApp Business Platform oficial",
    "NAO_IMPLEMENTADO",
    "Sem conexão Meta, canal verificado, templates, janela de envio, mensagens ou webhooks oficiais. Nenhuma mensagem real foi enviada.",
  ],
  [
    "Contatos e CRM",
    "NAO_IMPLEMENTADO",
    "Sem CRUD de contatos, busca, importação, segmentação, deduplicação ou histórico comercial.",
  ],
  [
    "Vendas, funis e oportunidades",
    "NAO_IMPLEMENTADO",
    "Sem domínio/CRUD de oportunidades, etapas, tarefas associadas ou valores comerciais confirmados.",
  ],
  [
    "Tarefas",
    "NAO_IMPLEMENTADO",
    "Sem backend de tarefas, responsáveis, prazos, conclusão ou lembretes operacionais.",
  ],
  [
    "Automações",
    "NAO_IMPLEMENTADO",
    "UI com modelos e wizard de três etapas, rascunho apenas em memória. Sem backend de publicação, avaliação de consentimento, agendamento, execução ou pausa de fluxos.",
  ],
  [
    "Conhecimento, IA e RAG",
    "NAO_IMPLEMENTADO",
    "Sem ingestão, base de conhecimento operacional ou inferência/assistência real.",
  ],
  [
    "Relatórios e receita",
    "NAO_IMPLEMENTADO",
    "Sem agregações comerciais, indicadores ou distinção operacional entre proposta/ganho/receita liquidada. Nenhum número comercial é inventado.",
  ],
  [
    "Assinatura Mercado Pago",
    "NAO_IMPLEMENTADO",
    "Somente fronteiras/ports. Sem checkout real, catálogo, entitlement, cancelamento, webhook, faturas ou reconciliação.",
  ],
  [
    "Consentimento, privacidade e DSAR",
    "NAO_IMPLEMENTADO",
    "Sem registro operacional por finalidade/canal, revogação ou atendimento DSAR. Termos/política aprovados e canais oficiais ausentes.",
  ],
  [
    "Console administrativo interno",
    "NAO_IMPLEMENTADO",
    "Existem referências visuais em sandbox; não há venda-admin/venda-admin-api funcional, identidade interna e MFA validados.",
  ],
  [
    "Outbox/inbox",
    "PARCIAL",
    "Persistência atômica e deduplicação testadas. Sem publisher, consumer de negócio, SQS/DLQ ou workers operacionais.",
  ],
  [
    "Auditoria e observabilidade",
    "PARCIAL",
    "Auditoria append-only e OTLP em collector de teste. Web Vitals local; sem collector RUM ou operação observada em produção.",
  ],
  [
    "Acessibilidade e marca",
    "PARCIAL",
    "Inter/tokens e testes automatizados/teclado locais. Sem certificação WCAG integral/tecnologia assistiva; SVG oficial e aprovação de arte pendentes.",
  ],
  [
    "Implantação e operação",
    "NAO_VALIDADO",
    "Sem evidência neste repositório de operação AWS produtiva, restore de backup/DR, WAF/HSTS, scanning CI e carga produtiva acordada.",
  ],
];
const facts = {
  assessedAt: new Date().toISOString(),
  timezone: "America/Sao_Paulo",
  platform100Functional: false,
  productionReady: false,
  dependencies,
  scope:
    "Código e ambiente local deste repositório; não certifica sistemas externos.",
  prdV01toV24Available: false,
  canonicalMissing: missing,
  capabilities: capabilities.map(([feature, status, reason]) => ({
    feature,
    status,
    reason,
  })),
  directories: Object.fromEntries(
    [
      "venda-admin",
      "venda-admin-api",
      "venda-workers",
      "infra",
      "terraform",
      ".github/workflows",
    ].map((p) => [p, fs.existsSync(path.join(root, p))]),
  ),
  browser: {
    initialPassed: initial.outcomes.filter((x) => x.status === "PASS").length,
    initialFailed: initial.outcomes.filter((x) => x.status === "FAIL"),
    finalPassed: final?.outcomes.filter((x) => x.status === "PASS").length,
    finalFailed: final?.outcomes.filter((x) => x.status === "FAIL") ?? null,
  },
  preview,
};
fs.writeFileSync(
  path.join(evidence, "funcionalidades.json"),
  JSON.stringify(facts, null, 2) + "\n",
);
const table = capabilities
  .map(([f, s, r]) => `| ${f} | ${s} | ${r} |`)
  .join("\n");
const probe =
  preview?.apiProbes.map((p) => `| ${p.endpoint} | ${p.status} |`).join("\n") ??
  "| Ainda não executadas | Pendente |";
const commandRows = commands.results
  .map(
    (c) =>
      `| ${c.name} | ${c.status} (${c.exitCode}) | ${(c.durationMs / 1000).toFixed(1)} s |`,
  )
  .join("\n");
const verdict = final?.passed
  ? "PASS no escopo testado"
  : "PENDENTE/FAIL: consultar evidências finais";
fs.writeFileSync(
  path.join(dir, "RELATORIO-FUNCIONAL.md"),
  `# Venda Flow AI — análise funcional

Data da revisão: 23/11/2026, America/Sao_Paulo. Base analisada: bcd4a9a e alterações desta branch de auditoria. Evidências possuem horário ISO UTC. Não foram usados banco de produção, credenciais reais de gateway, envio de mensagens ou infraestrutura de outro produto.

## Parecer

**A plataforma NÃO está 100% funcional e NÃO está pronta para produção.** Existe uma fundação real de identidade, organizações e isolamento, validada localmente. Os fluxos centrais de atendimento comercial/CRM, WhatsApp, vendas, tarefas, automações, conhecimento, relatórios, assinatura e console admin não estão implementados integralmente. Adicionar credenciais, por si só, não implementa esses domínios.

${uiActivation ? `Atualização de UI: ${uiActivation.htmlFiles} HTMLs do Stitch analisados, estruturas específicas ativas no cliente e menu lateral claro. Verificação nova: ${uiActivation.browser.pass} PASS / ${uiActivation.browser.fail} FAIL. Detalhes, capturas e diferenças explícitas no [relatório de aplicação dos HTMLs](../../ui-ativacao/RELATORIO.md). A ativação visual não altera o veredito funcional acima.` : ""}

Não atribuí um percentual de conclusão: o PRD V01–V24 está ausente e não existe uma base completa de critérios rastreáveis. Contagem de testes aprovados, menus e screenshots não é percentual de funcionalidades concluídas. As telas de indisponibilidade são estados honestos, não operações de negócio.

## Matriz de funcionalidades

LOCAL_OK significa comprovado apenas no ambiente local de teste, com dados DEMO_ONLY e PostgreSQL real. PARCIAL significa capacidade incompleta ou ainda sem validação externa. NAO_IMPLEMENTADO significa ausência do fluxo/domínio no código disponível. NAO_VALIDADO não permite conclusão sobre ambiente externo.

| Capacidade | Situação | Evidência / limite |
| --- | --- | --- |
${table}

Fonte de código principal: venda-api/src/app.ts, migrations/001_foundation.up.sql, venda-web/lib/api.server.ts, venda-web/lib/modules.ts e venda-web/app/(workspace)/app/o/[organizationId]/[[...section]]/page.tsx. Há 31 entradas no catálogo de rotas cliente/público; isso não representa 31 fluxos comerciais concluídos. Os detalhes de objetos comerciais sem contrato continuam 404. As referências de admin em Storybook/sandbox não constituem um console administrativo operacional.

## Testes desta revisão

- Frontend: ${web.numPassedTests} testes aprovados; ${web.numFailedTests} falhas, em evidencias/unitarios-web.json.
- Regressão UI: ${ui.numPassedTests} aprovados; ${ui.numFailedTests} falhas, em evidencias/regressao-ui.json.
- Backend: suíte com 28 casos, PostgreSQL nativo real, JUnit em evidencias/backend-resultados.xml. Resultado do processo em comandos.json.
- Integração inicial: ${facts.browser.initialPassed} PASS e ${facts.browser.initialFailed.length} FAIL; o cenário novo identificou perda do rascunho após falha de alteração.
- Integração final: ${facts.browser.finalPassed ?? "pendente"} PASS e ${facts.browser.finalFailed?.length ?? "pendente"} FAIL; ${verdict}. Evidência em evidencias/integracao-final/browser.json.
- IdP de teste assinado RSA/JWKS, nunca confundido com provedor OIDC externo. Cookie e CSRF em loopback confiável não comprovam TLS/MFA produtivos.

| Comando/check | Resultado (exit) | Duração |
| --- | --- | --- |
${commandRows}

Comandos exatos, cwd, duração e saída redigida estão em evidencias/comandos.json e logs. Para reproduzir: npm run audit:platform; após uma correção, npm run audit:platform -- --retest. Testes usam fixtures descartáveis; o launcher de revisão cria outro banco isolado após o término dos testes. Evidências antigas da etapa 04 foram preservadas, não reclassificadas como execuções de hoje.

## Defeito encontrado e corrigido

Ao editar uma organização e interromper a API, a Server Action devolvia erro, mas o reset automático do formulário removia o texto digitado. O banco permanecia sem a alteração. A revisão acrescentou um teste que checa simultaneamente o rascunho na interface e o nome persistido no PostgreSQL. A correção cancela o reset nesse formulário; sucesso continua redirecionando para o estado confirmado. A intenção idempotente permanece a mesma.

Há evidências anteriores e posteriores da correção, sem esconder a falha inicial. Outros limites conhecidos: paginação de memberships e identificação da própria capacidade, convites/nomes ausentes, edição concorrente e auditoria assistiva completa ainda exigem trabalho.

## Sondagem da API durante a demonstração

Requisições locais feitas com sessão autenticada criada pelo protocolo OIDC e API reais. Nenhuma sessão foi inserida diretamente em SQL. Resultados em preview.json.

| Endpoint | HTTP |
| --- | --- |
${probe}

Os seis endpoints comerciais de referência não estão no controller/contrato candidato. Um 404 autenticado, combinado com a leitura de código, confirma ausência da operação neste repositório. Não se confunde isso com integração apenas aguardando credenciais.

## Segurança, desempenho e evidências externas

Consultas atuais npm audit nesta revisão: frontend ${dependencies.web.total} vulnerabilidades conhecidas, backend ${dependencies.api.total}. Os JSON originais estão em npm-audit-web.json e npm-audit-api.json. Isso não substitui testes de aplicação, SAST/DAST ou avaliação ASVS completa.

Verificados localmente: RLS FORCE sob role sem bypass, contexto de transação, isolamento A/B por path/body/query/header, viewer 403, membership revalidado, sessão/cookies/CSRF, idempotência concorrente, outbox/inbox e auditoria append-only, logs por allowlist, prazo de headers/corpo e falhas de rede. A aprovação se limita aos casos/dataset executados; não é certificação ASVS nem prova de ausência de regressões.

RUM de campo, INP por segmento, carga real, DNS/TLS, proxy confiável, backup restaurável e operação AWS não foram certificados. As métricas Lighthouse da etapa 04 são de 21/11, laboratório local, e permanecem históricas: LCP p75 landing aproximadamente 297ms desktop e 897ms mobile simulado; TBT mobile 567ms, risco de interatividade. Não foram apresentadas como medições novas nem garantia de um segundo. A rodada de navegador de hoje mede FCP/TTFB local, com condições em integracao-final/performance.json; isso também não substitui dados de campo.

As referências canônicas ausentes são: ${missing.join(", ")}; PRD V01–V24 também não foi fornecido. O GitHub conectado foi consultado nesta revisão e respondeu que o repositório está vazio. Não houve push/deploy. Nenhuma estatística comercial, preço, receita ou cliente real foi inventado.

## Plataforma rodando no Chrome

URL local: ${preview?.url ?? "a iniciar"}. O ambiente tem faixa DEMO_ONLY, PostgreSQL descartável real e IdP de protocolo simulado. A organização de teste chama-se DEMO_ONLY — Revisão funcional. O usuário consegue percorrer a fundação disponível; módulos ausentes continuam identificados como indisponíveis.

Inicialização: npm run review:local. O launcher exige --demo-only, embutido nesse comando, restringe serviços a 127.0.0.1 e não usa credenciais produtivas. Ctrl+C no processo encerra Next, API, IdP e remove seu banco temporário. Nenhum dado desse ambiente deve ser usado em operação real. A inspeção do Chrome visível é registrada separadamente em evidencias/chrome.json; capturas headless são identificadas como teste automatizado.

![Chrome com a plataforma local DEMO_ONLY](evidencias/chrome-plataforma.jpg)

## Prioridades para operação real

**P0:** reconciliar PRD/arquitetura/OpenAPI/segurança; concluir domínios comerciais com contratos e testes; integrar WhatsApp oficial; integrar assinatura/entitlements Mercado Pago e reconciliação; validar identidade externa, cadastro/reset e admin/MFA; publicar documentos legais e fluxos de consentimento/DSAR; validar isolamento e credenciais em sandbox de provedores, TLS/proxy e operação/backup.

**P1:** resolver limites de paginação/equipe/concorrência; validar acessibilidade assistiva e dispositivos reais; aprovar SVG/baselines de arte; instrumentar RUM e carga com budgets por rota; testar incidentes, retries/DLQ e recuperação.

**P2:** atalhos/busca e otimizações de alto volume após implementação dos módulos e disponibilidade de dados reais.

## Aceite desta auditoria

PASS para a análise baseada no código/testes e para a demonstração local quando as evidências finais estiverem aprovadas. FAIL para a afirmação “plataforma 100% funcional” e para liberação produtiva. N/A para testes reais de cobrança/envio Meta, pois não há integrações operacionais. Nenhum endpoint, preço ou resultado de produção foi criado para preencher lacunas. Esta auditoria não executou automaticamente a etapa 05.
`,
);
console.log("Relatório e matriz funcional atualizados.");
