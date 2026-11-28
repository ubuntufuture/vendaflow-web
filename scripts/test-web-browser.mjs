// DEMO_ONLY integration harness. Never imported by venda-web runtime.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
const root = process.cwd();
const output = path.resolve(
  root,
  process.env.VENDA_WEB_EVIDENCE_DIR ?? "docs/frontend/evidencias",
);
if (!output.startsWith(root + path.sep))
  throw new Error("Evidência fora do workspace.");
fs.mkdirSync(path.join(output, "telas"), { recursive: true });
const outcomes = [],
  screenshots = [],
  pageErrors = [],
  samples = [],
  vitals = [];
const record = (name, ok, detail) => {
  outcomes.push({
    name,
    status: ok ? "PASS" : "FAIL",
    ...(detail ? { detail } : {}),
  });
  if (!ok) console.log(`FAIL: ${name}`, JSON.stringify(detail ?? ""));
  else if (outcomes.length % 20 === 0)
    console.log(`${outcomes.length} verificações executadas`);
};
// Keep disposable test data off the user's persistent application port.
const testPort = 3491;
const base = `http://127.0.0.1:${testPort}`;
let fixture, idp, runtime, browser, web, nextApp, worker, activePage;
const authDiagnostics=[],apiDiagnostics=[];
const workerLogs=[];
async function check(name, fn) {
  try {
    await fn();
    record(name, true);
  } catch (error) {
    record(name, false, error.message);
    throw error;
  }
}
async function axe(page, label) {
  const result = await new AxeBuilder({ page })
    // WCAG 1.4.3 exempts logotypes. Audit their accessible name and asset separately.
    .exclude(".vf-wordmark")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  record(
    `axe ${label}`,
    result.violations.length === 0,
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  );
}
async function shot(page, name) {
  const p = path.join(output, "telas", `${name}.png`);
  await page.screenshot({ path: p, fullPage: true, animations: "disabled" });
  screenshots.push(`telas/${name}.png`);
  return p;
}
async function goto(page, route) {
  await page.goto(base + route, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
}
async function login(page, subject) {
  await idp.select(subject);
  await goto(page, "/entrar");
  await page.getByRole("link", { name: "Continuar com acesso seguro" }).click();
  if(idp.real){await page.locator('#username').fill(subject);await page.locator('#password').fill(idp.password);await page.locator('#kc-login').click();}
  await page.waitForURL(base + "/app", { timeout: 20000 });
  await page
    .getByRole("heading", { name: "Escolha sua organização" })
    .waitFor();
}
async function createOrg(page, name) {
  await goto(page, "/configurar");
  await page.getByLabel("Nome da organização (obrigatório)").fill(name);
  await page
    .getByLabel("Fuso horário IANA (obrigatório)")
    .fill("America/Sao_Paulo");
  await page.getByRole("button", { name: "Criar minha organização" }).click();
  await page.waitForURL(/\/app\/o\/[a-f\d-]{36}$/i, { timeout: 20000 });
  await page
    .getByRole("heading", { name: "Início", exact: true })
    .waitFor();
  return new URL(page.url()).pathname;
}
try {
  process.env.NODE_ENV = "test";
  process.chdir(path.join(root, "venda-api"));
  const { freePort } = await import(
    pathToFileURL(path.join(root, "venda-api/dist/test/postgres.js")).href
  );
  const { postgresFixture } = await import(
    pathToFileURL(path.join(root, "venda-web/test/postgres-adapter.mjs")).href
  );
  const { idpFixture } = await import(
    pathToFileURL(path.join(root, "venda-api/dist/test/idp.js")).href
  );
  const { loadConfig } = await import(
    pathToFileURL(path.join(root, "venda-api/dist/src/config.js")).href
  );
  const { createApp } = await import(
    pathToFileURL(path.join(root, "venda-api/dist/src/app.js")).href
  );
  const { Database } = await import(
    pathToFileURL(path.join(root, "venda-api/dist/src/database.js")).href
  );
  fixture = await postgresFixture();
  const workerPassword=randomBytes(32).toString('hex');
  await fixture.control.query(`CREATE ROLE venda_browser_worker LOGIN NOSUPERUSER NOBYPASSRLS INHERIT PASSWORD '${workerPassword}'`);
  await fixture.control.query('GRANT venda_worker TO venda_browser_worker');
  const workerUrl=new URL(fixture.databaseUrl);workerUrl.username='venda_browser_worker';workerUrl.password=workerPassword;
  worker=spawn(process.execPath,[path.join(root,'venda-workers/build/main.js')],{cwd:root,env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,NODE_ENV:'test',VENDA_WORKER_DATABASE_URL:workerUrl.href},windowsHide:true,stdio:['ignore','pipe','pipe']});
  worker.stdout.on('data',data=>workerLogs.push(String(data)));worker.stderr.on('data',data=>workerLogs.push(String(data)));
  if(process.env.VENDA_TEST_REAL_OIDC==='true'){const {realKeycloakFixture}=await import(pathToFileURL(path.join(root,'venda-web/test/keycloak-adapter.mjs')).href);idp=await realKeycloakFixture(root,base);}else idp=await idpFixture();
  const port = await freePort();
  const config = loadConfig({
    NODE_ENV: "test",
    BILLING_ENVIRONMENT: "test",
    BILLING_ENABLED: "false",
    PORT: String(port),
    DATABASE_URL: fixture.databaseUrl,
    API_ORIGIN: base,
    APP_ORIGIN: base,
    OIDC_ISSUER: idp.issuer,
    OIDC_CLIENT_ID: idp.clientId,
    OIDC_CLIENT_SECRET: idp.clientSecret,
    SESSION_HASH_KEY: randomBytes(32).toString("hex"),
    FLOW_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
    CSRF_KEY: randomBytes(32).toString("hex"),
  });
  // DEMO_ONLY catalog in this disposable cluster; never copied to the persistent app.
  const catalogActor=(await fixture.control.query("INSERT INTO venda_admin.users(issuer,subject,role) VALUES('https://demo-only.invalid','DEMO_ONLY-browser-billing','platform_admin') RETURNING id")).rows[0];
  const billingPlan=(await fixture.control.query("INSERT INTO venda_admin.plan_versions(code,version,name,amount_cents,frequency,frequency_type,features,limits,created_by,environment) VALUES('teste-demo-browser',1,'TESTE DEMO_ONLY navegador',1000,1,'months','[\"crm\"]','{}',$1,'test') RETURNING id",[catalogActor.id])).rows[0];
  await fixture.control.query("UPDATE venda_admin.plan_versions SET status='published',revision=2,published_at=clock_timestamp() WHERE id=$1",[billingPlan.id]);
  runtime = await createApp(config, new Database(config), line => apiDiagnostics.push(JSON.parse(line)));
  await runtime.app.listen(port, "127.0.0.1");
  process.chdir(root);
  process.env.VENDA_WEB_ORIGIN = base;
  process.env.VENDA_API_INTERNAL_ORIGIN = `http://127.0.0.1:${port}`;
  process.env.VENDA_WEB_LOCAL_TEST = "true";
  process.env.NODE_ENV = "production";
  const { default: next } = await import("next");
  nextApp = next({
    dev: false,
    dir: path.join(root, "venda-web"),
    hostname: "127.0.0.1",
    port: testPort,
  });
  await nextApp.prepare();
  web = createServer(nextApp.getRequestHandler());
  await new Promise((resolve) => web.listen(testPort, "127.0.0.1", resolve));
  if(idp.real)await check('API prepara fluxo OIDC real antes da navegação',async()=>{const response=await fetch(`http://127.0.0.1:${port}/v1/auth/login`,{redirect:'manual'});assert.equal(response.status,302);});
  browser = await chromium.launch({
    executablePath:
      process.env.UI_CHROME_PATH ??
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  if(idp.real){const smokeContext=await browser.newContext({locale:'pt-BR'});const smoke=await smokeContext.newPage();activePage=smoke;smoke.on('response',response=>{const url=new URL(response.url());authDiagnostics.push({origin:url.origin,path:url.pathname,status:response.status()});});await check('login real Keycloak sem simulador de protocolo',()=>login(smoke,'DEMO_ONLY-smoke'));await smokeContext.close();}
  activePage=page;
  if(process.env.VENDA_WEB_OIDC_SMOKE_ONLY!=='true'){
  page.on("pageerror", (error) => {const entry={message:error.message,path:new URL(page.url()).pathname};pageErrors.push(entry);console.log('Erro do navegador:',JSON.stringify(entry));});
  await context.addInitScript(() => {
    window.__vendaVitals = [];
    window.addEventListener("venda:web-vital", (e) =>
      window.__vendaVitals.push(e.detail),
    );
  });
  // Public-only trace: authenticated cookies, codes, CSRF and private payloads are never traced.
  await context.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: true,
  });
  for (const size of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    for (const route of [
      "/",
      "/entrar",
      "/cadastro",
      "/recuperar-acesso",
      "/planos",
      "/privacidade",
      "/termos",
      "/app",
    ]) {
      await goto(page, route);
      await axe(page, `${route} ${size.name}`);
      record(
        `reflow ${route} ${size.name}`,
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      record(
        `título único ${route} ${size.name}`,
        (await page.locator("h1").count()) === 1,
      );
      record(
        `Inter local ${route} ${size.name}`,
        await page.evaluate(
          () =>
            getComputedStyle(document.body).fontFamily.includes("localFont") ||
            getComputedStyle(document.body).fontFamily.includes("inter"),
        ),
      );
      if (route === "/") record(`marca com nome acessível e imagem carregada ${size.name}`, await page.locator(".vf-wordmark").evaluateAll(elements => elements.length > 0 && elements.every(el => el.getAttribute("role") === "img" && el.getAttribute("aria-label") === "Venda Flow AI" && [...el.querySelectorAll("img")].every(img => img.getBoundingClientRect().top >= innerHeight || img.complete && img.naturalWidth > 0))));
      await shot(page, `${route.replaceAll("/", "-") || "home"}-${size.name}`);
    }
    await goto(page, "/");
    await page.getByRole("button", { name: "Ativar tema escuro" }).click();
    await axe(page, `home dark ${size.name}`);
    await shot(page, `home-dark-${size.name}`);
    await page.getByRole("button", { name: "Ativar tema claro" }).click();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await goto(page, "/pagina-inexistente");
  record(
    "404 público mantém landmark e destino de skip link únicos",
    (await page.locator("main").count()) === 1 &&
      (await page.locator("#conteudo").count()) === 1 &&
      (await page
        .getByRole("heading", { name: "Página não encontrada", exact: true })
        .isVisible()),
  );
  await axe(page, "404 público");
  await shot(page, "publico-404");
  await goto(page, "/");
  await page.keyboard.press("Tab");
  record(
    "skip link é o primeiro foco",
    await page
      .getByRole("link", { name: "Pular para o conteúdo" })
      .evaluate((el) => el === document.activeElement),
  );
  await page.keyboard.press("Enter");
  record(
    "skip link alcança conteúdo",
    await page.evaluate(() => document.activeElement?.id === "conteudo"),
  );
  const first = await shot(page, "home-baseline");
  const second = await shot(page, "home-repeticao");
  const a = PNG.sync.read(fs.readFileSync(first)),
    b = PNG.sync.read(fs.readFileSync(second));
  const diff = new PNG({ width: a.width, height: a.height });
  const changed = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
    threshold: 0.1,
  });
  fs.writeFileSync(
    path.join(output, "diff-repetibilidade.png"),
    PNG.sync.write(diff),
  );
  record("diff visual local estável", changed === 0, {
    changedPixels: changed,
  });
  const comparison = await context.newPage();
  await comparison.setViewportSize({ width: 1800, height: 1100 });
  await comparison.setContent(
    `<html lang="pt-BR"><head><title>Comparação de marca</title></head><body style="font-family:Arial;background:#FFFFFF;color:#0B0E14;margin:24px"><h1>Venda Flow AI — referência e implementação</h1><p>Board recebido à esquerda; landing implementada à direita. Comparação de identidade, sem equivalência pixel a pixel ou aprovação de logo.</p><div style="display:flex;gap:24px;align-items:flex-start"><img alt="Brandboard recebido, referência não produtiva" style="width:820px" src="data:image/png;base64,${fs.readFileSync(path.join(root, "branding/brandboard.png")).toString("base64")}"><img alt="Landing implementada" style="width:820px" src="data:image/png;base64,${fs.readFileSync(first).toString("base64")}"></div></body></html>`,
  );
  await comparison.screenshot({
    path: path.join(output, "comparacao-brandboard.png"),
    fullPage: true,
  });
  await comparison.close();
  await context.tracing.stop({
    path: path.join(output, "publico-playwright.zip"),
  });
  await check(
    "login OIDC real de protocolo e cookie HttpOnly Secure",
    async () => {
      await login(page, "DEMO_ONLY-owner-A");
      const cookie = (await context.cookies()).find(
        (c) => c.name === "__Host-venda_session",
      );
      assert.ok(
        cookie?.httpOnly &&
          cookie.secure &&
          cookie.sameSite === "Lax" &&
          cookie.path === "/",
      );
      assert.ok(
        !(await page.evaluate(() => document.cookie)).includes(
          "__Host-venda_session",
        ),
      );
    },
  );
  await axe(page, "organizações vazio");
  await shot(page, "organizacoes-vazio");
  await goto(page, "/configurar");
  await axe(page, "onboarding");
  await page.getByLabel("Nome da organização (obrigatório)").fill("DEMO_ONLY");
  await page.getByLabel("Fuso horário IANA (obrigatório)").fill("invalido");
  await page.getByRole("button", { name: "Criar minha organização" }).click();
  await page.locator('form [role="alert"]').waitFor();
  record(
    "erro Zod de timezone anunciado e focado",
    await page
      .locator('form [role="alert"]')
      .evaluate((el) => el === document.activeElement),
  );
  await shot(page, "onboarding-validacao");
  const orgA = await createOrg(page, "DEMO_ONLY — Equipe A");
  await goto(page,orgA+'/clientes');
  await page.getByRole('button',{name:'Adicionar contato',exact:true}).click();
  await page.getByLabel('Nome (obrigatório)',{exact:true}).fill('DEMO_ONLY contato pelo navegador');
  await page.getByLabel('Telefone internacional (com + e DDI)',{exact:true}).fill('+5511987650001');
  await page.getByRole('button',{name:'Criar registro',exact:true}).click();
  await page.getByText('DEMO_ONLY contato pelo navegador',{exact:true}).first().waitFor();
  record('contato criado pela UI está persistido no PostgreSQL', (await fixture.control.query('SELECT id FROM venda.contacts WHERE organization_id=$1 AND name=$2',[orgA.split('/').at(-1),'DEMO_ONLY contato pelo navegador'])).rowCount===1);
  await page.getByRole('button',{name:'Editar DEMO_ONLY contato pelo navegador',exact:true}).click();
  await page.getByLabel('Nome (obrigatório)',{exact:true}).fill('DEMO_ONLY contato revisado');
  await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();
  await page.getByText('DEMO_ONLY contato revisado',{exact:true}).first().waitFor();
  record('edição do contato é confirmada no banco',(await fixture.control.query('SELECT version FROM venda.contacts WHERE organization_id=$1 AND name=$2',[orgA.split('/').at(-1),'DEMO_ONLY contato revisado'])).rows[0]?.version===2);
  await goto(page,orgA+'/vendas');
  await page.getByRole('button',{name:'Nova oportunidade',exact:true}).click();
  await page.getByLabel('Oportunidade (obrigatório)',{exact:true}).fill('DEMO_ONLY proposta pelo navegador');
  await page.getByRole('combobox',{name:/^Etapa/}).selectOption('proposal');
  await page.getByRole('spinbutton',{name:/^Valor da proposta em BRL/}).fill('15000');
  await page.getByRole('button',{name:'Criar registro',exact:true}).click();
  await page.getByText('DEMO_ONLY proposta pelo navegador',{exact:true}).first().waitFor();
  record('oportunidade no kanban usa valor confirmado em centavos',(await fixture.control.query('SELECT amount_cents FROM venda.opportunities WHERE organization_id=$1 AND title=$2',[orgA.split('/').at(-1),'DEMO_ONLY proposta pelo navegador'])).rows[0]?.amount_cents==='15000');
  await goto(page,orgA+'/tarefas');
  await page.getByRole('button',{name:'Nova tarefa',exact:true}).click();
  await page.getByLabel('Tarefa (obrigatório)',{exact:true}).fill('DEMO_ONLY tarefa pelo navegador');
  await page.getByRole('button',{name:'Criar registro',exact:true}).click();
  await page.getByText('DEMO_ONLY tarefa pelo navegador',{exact:true}).first().waitFor();
  record('tarefa criada pela UI está persistida',(await fixture.control.query('SELECT id FROM venda.tasks WHERE organization_id=$1 AND title=$2',[orgA.split('/').at(-1),'DEMO_ONLY tarefa pelo navegador'])).rowCount===1);
  await goto(page,orgA+'/conhecimento');
  await page.getByRole('button',{name:'Adicionar conhecimento',exact:true}).click();
  await page.getByLabel('Título (obrigatório)',{exact:true}).fill('DEMO_ONLY fonte pelo navegador');
  await page.getByLabel('Conteúdo (obrigatório)',{exact:true}).fill('DEMO_ONLY texto de teste sem dados pessoais.');
  await page.getByRole('button',{name:'Criar registro',exact:true}).click();
  await page.getByText('DEMO_ONLY fonte pelo navegador',{exact:true}).first().waitFor();
  record('conhecimento textual foi gravado no banco',(await fixture.control.query('SELECT id FROM venda.knowledge WHERE organization_id=$1 AND title=$2',[orgA.split('/').at(-1),'DEMO_ONLY fonte pelo navegador'])).rowCount===1);
  await goto(page,orgA+'/relatorios');
  record('relatório da UI diferencia proposta de receita',await page.getByText('R$ 150,00',{exact:true}).isVisible()&&await page.getByRole('heading',{name:'Receita confirmada',exact:true}).isVisible());
  await goto(page,orgA+'/configuracoes/privacidade');
  await page.getByRole('button',{name:'Registrar concessão ou revogação',exact:true}).click();
  await page.getByRole('combobox',{name:/^Contato/}).selectOption({label:'DEMO_ONLY contato revisado'});
  await page.getByRole('combobox',{name:/^Finalidade/}).selectOption('marketing');
  await page.getByLabel('Versão do aviso apresentado',{exact:true}).fill('DEMO_ONLY-v1');
  await page.getByLabel('Referência da evidência ou solicitação').fill('DEMO_ONLY opt-in documentado');
  await page.getByRole('button',{name:'Registrar',exact:true}).click();
  await page.getByRole('cell',{name:'Concedido',exact:true}).waitFor();
  record('UI registra consentimento real por finalidade e canal',(await fixture.control.query('SELECT id FROM venda.consents WHERE organization_id=$1',[orgA.split('/').at(-1)])).rowCount===1);
  await page.getByRole('button',{name:'Registrar solicitação',exact:true}).click();
  await page.getByRole('combobox',{name:/^Contato/}).selectOption({label:'DEMO_ONLY contato revisado'});
  await page.getByRole('combobox',{name:/^Tipo de solicitação/}).selectOption('export');
  await page.getByLabel('Referência da evidência ou solicitação').fill('DEMO_ONLY identidade verificada');
  await page.getByRole('button',{name:'Registrar',exact:true}).click();
  await page.getByRole('cell',{name:'Em análise',exact:true}).waitFor();
  const exportResponse=await page.request.get(base+(await page.getByRole('link',{name:/^Exportar dados/}).getAttribute('href')));
  record('exportação BFF exige sessão e entrega somente dados autorizados',exportResponse.ok()&&exportResponse.headers()['cache-control']==='private, no-store'&&(await exportResponse.json()).contact.name==='DEMO_ONLY contato revisado');
  await goto(page,orgA+'/faturamento');
  record('faturamento lê plano TESTE do banco',await page.getByRole('cell',{name:/TESTE DEMO_ONLY navegador/}).isVisible());
  record('checkout sem configuração permanece desabilitado',await page.getByRole('button',{name:'Preparar checkout',exact:true}).isDisabled());
  config.billingEnabled=true;await page.getByRole('button',{name:'Atualizar situação',exact:true}).click();
  await page.getByRole('combobox',{name:/^Plano/}).selectOption(billingPlan.id);
  await page.getByRole('textbox',{name:/^E-mail do pagador/}).fill('DEMO_ONLY@testuser.com');
  await page.getByRole('checkbox',{name:/Conferi o plano/}).check();
  await page.getByRole('button',{name:'Preparar checkout',exact:true}).click();
  await page.getByRole('heading',{name:'Preparando checkout',exact:true}).waitFor();
  record('UI registra intenção durável sem pagamento fictício',(await fixture.control.query('SELECT id FROM venda.billing_subscriptions WHERE organization_id=$1',[orgA.split('/').at(-1)])).rowCount===1);
  await page.getByRole('checkbox',{name:/Solicito o cancelamento/}).check();await page.getByRole('button',{name:'Solicitar cancelamento',exact:true}).click();
  await page.getByRole('heading',{name:'Cancelamento em processamento',exact:true}).waitFor();
  const billingPassword=randomBytes(32).toString('hex');await fixture.control.query(`CREATE ROLE venda_browser_billing LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD '${billingPassword}'`);await fixture.control.query('GRANT venda_billing_worker TO venda_browser_billing');
  const billingUrl=new URL(fixture.databaseUrl);billingUrl.username='venda_browser_billing';billingUrl.password=billingPassword;
  const {createRequire}=await import('node:module');const pg=createRequire(path.join(root,'venda-api/package.json'))('pg');const billingPool=new pg.Pool({connectionString:billingUrl.href,max:1});
  const {processBillingOnce}=await import(pathToFileURL(path.join(root,'venda-workers/build/billing/processor.js')).href);let externalBillingCalls=0;const neverCall=async()=>{externalBillingCalls++;throw new Error('DEMO_ONLY: nenhuma chamada externa esperada');};
  try{for(let i=0;i<3;i++)await processBillingOnce(billingPool,{create:neverCall,get:neverCall,cancel:neverCall},'test');}finally{await billingPool.end();}
  await page.getByRole('button',{name:'Atualizar situação',exact:true}).click();await page.getByRole('heading',{name:'Assinatura cancelada',exact:true}).waitFor();
  record('UI só confirma cancelamento após worker; zero chamada externa',externalBillingCalls===0);config.billingEnabled=false;
  record(
    "onboarding confirmou organização no PostgreSQL",
    !!(
      await fixture.control.query(
        "SELECT id FROM venda.organizations WHERE name=$1",
        ["DEMO_ONLY — Equipe A"],
      )
    ).rows.length,
  );
  for (const size of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "tablet", width: 1024, height: 768 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    for (const slug of [
      "",
      "/configuracoes/organizacao",
      "/configuracoes/equipe",
      "/conversas",
      "/clientes",
      "/vendas",
      "/tarefas",
      "/automacoes",
      "/automacoes/nova",
      "/automacoes/assistente",
      "/relatorios",
      "/configuracoes/canais",
      "/configuracoes/privacidade",
      "/faturamento",
    ]) {
      await goto(page, orgA + slug);
      if (size.name === "mobile" && slug === "") {
        record(
          "menu mobile começa recolhido e prioriza conteúdo",
          !(await page
            .locator("details.workspace-menu")
            .evaluate((el) => el.open)),
        );
        await page.locator("details.workspace-menu summary").focus();
        await page.keyboard.press("Space");
        record(
          "menu mobile abre com teclado",
          await page
            .locator("details.workspace-menu")
            .evaluate((el) => el.open),
        );
        await page.keyboard.press("Space");
      }
      await axe(page, `app ${slug} ${size.name}`);
      const reflow=await page.evaluate(()=>({fits:document.documentElement.scrollWidth<=innerWidth,viewport:innerWidth,width:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].map(el=>({tag:el.tagName,class:el.className,right:el.getBoundingClientRect().right})).filter(el=>el.right>innerWidth+1).slice(0,20)}));
      record(
        `app reflow ${slug} ${size.name}`,
        reflow.fits,
        reflow.fits?undefined:reflow,
      );
      await shot(
        page,
        `app${slug.replaceAll("/", "-") || "-inicio"}-${size.name}`,
      );
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await goto(page, orgA + "/clientes");
  await page.getByRole("button", { name: "Adicionar contato", exact: true }).click();
  record("painel lateral usa dialog modal com foco contido", await page.getByRole("dialog").isVisible() && await page.getByRole("dialog").evaluate(el => el.contains(document.activeElement)));
  await page.keyboard.press("Escape");
  record("Escape fecha painel e devolve foco ao botão", !(await page.getByRole("dialog").isVisible()) && await page.getByRole("button", {name:"Adicionar contato",exact:true}).evaluate(el => el === document.activeElement));
  await goto(page, orgA + "/automacoes/nova");
  await page.getByLabel('Nome da automação (obrigatório)',{exact:true}).fill('DEMO_ONLY fluxo pelo wizard');
  await page.getByRole("radio", {name:"Oportunidade ganha"}).check();
  await page.getByRole("button", {name:"Continuar",exact:true}).click();
  await page.getByLabel("Título da tarefa (obrigatório)",{exact:true}).fill("DEMO_ONLY — instrução temporária");
  await page.getByRole("button", {name:"Continuar",exact:true}).click();
  record("wizard preserva rascunho entre etapas", await page.getByText("Criar tarefa: DEMO_ONLY — instrução temporária", {exact:true}).isVisible());
  record('avançar no wizard não persiste antes da confirmação',(await fixture.control.query('SELECT id FROM venda.workflows WHERE organization_id=$1 AND name=$2',[orgA.split('/').at(-1),'DEMO_ONLY fluxo pelo wizard'])).rowCount===0);
  await page.getByRole("button", {name:"Salvar rascunho",exact:true}).click();
  await page.waitForURL(base+orgA+'/automacoes');
  record('confirmação do wizard cria exatamente um registro',(await fixture.control.query('SELECT id FROM venda.workflows WHERE organization_id=$1 AND name=$2',[orgA.split('/').at(-1),'DEMO_ONLY fluxo pelo wizard'])).rowCount===1);
  record('wizard grava automação real sem ativação implícita',(await fixture.control.query('SELECT status FROM venda.workflows WHERE organization_id=$1 AND name=$2',[orgA.split('/').at(-1),'DEMO_ONLY fluxo pelo wizard'])).rows[0]?.status==='draft');
  await page.getByRole('button',{name:'Ativar DEMO_ONLY fluxo pelo wizard',exact:true}).click();
  await page.getByRole('button',{name:'Ativar automação',exact:true}).click();
  await page.getByRole('button',{name:'Pausar DEMO_ONLY fluxo pelo wizard',exact:true}).waitFor();
  await goto(page,orgA+'/vendas');
  await page.getByRole('button',{name:'Editar DEMO_ONLY proposta pelo navegador',exact:true}).click();
  await page.getByRole('combobox',{name:/^Etapa/}).selectOption('won');
  await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();
  await page.getByRole('button',{name:'Editar DEMO_ONLY proposta pelo navegador',exact:true}).waitFor();
  let automaticTask;
  for(let attempt=0;attempt<75;attempt++){automaticTask=(await fixture.control.query('SELECT id FROM venda.tasks WHERE organization_id=$1 AND title=$2',[orgA.split('/').at(-1),'DEMO_ONLY — instrução temporária'])).rows[0];if(automaticTask)break;await new Promise(r=>setTimeout(r,200));}
  record('worker TypeScript separado cria tarefa real com credencial própria',!!automaticTask&&workerLogs.some(line=>line.includes('"status":"ready"'))&&!workerLogs.some(line=>line.includes('WORKER_UNAVAILABLE')));
  await goto(page,orgA+'/automacoes');
  await page.getByRole('button',{name:'Execuções DEMO_ONLY fluxo pelo wizard',exact:true}).click();
  await page.getByRole('dialog').getByText('Tarefa criada',{exact:true}).waitFor();
  record('UI exibe recibo confirmado da execução',await page.getByRole('dialog').getByText('Tarefa criada',{exact:true}).isVisible());
  await page.getByRole('button',{name:'Fechar painel',exact:true}).click();
  await page.getByRole('button',{name:'Pausar DEMO_ONLY fluxo pelo wizard',exact:true}).click();
  await page.getByRole('button',{name:'Pausar automação',exact:true}).click();
  await page.getByRole('button',{name:'Ativar DEMO_ONLY fluxo pelo wizard',exact:true}).waitFor();
  record('pausa é confirmada no PostgreSQL',(await fixture.control.query('SELECT status FROM venda.workflows WHERE organization_id=$1 AND name=$2',[orgA.split('/').at(-1),'DEMO_ONLY fluxo pelo wizard'])).rows[0]?.status==='paused');
  await goto(page, orgA + "/conversas");
  await page.getByLabel("Rascunho de mensagem", {exact:true}).fill("DEMO_ONLY — mensagem não enviada");
  await page.getByRole("button", {name:"Enviar mensagem",exact:true}).click();
  record("envio indisponível preserva texto sem simular sucesso", (await page.getByLabel("Rascunho de mensagem",{exact:true}).inputValue()) === "DEMO_ONLY — mensagem não enviada" && await page.locator('.st-page > [role="alert"]').isVisible());
  record("menu lateral claro conforme preferência", await page.locator(".workspace-sidebar").evaluate(el => getComputedStyle(el).backgroundColor === "rgb(255, 255, 255)"));
  await goto(page, orgA + "/configuracoes/organizacao");
  await page
    .getByLabel("Nome da organização (obrigatório)")
    .fill("DEMO_ONLY — Equipe A revisada");
  await page.getByRole("button", { name: "Salvar organização" }).click();
  await page
    .getByText("DEMO_ONLY — Equipe A revisada", { exact: true })
    .first()
    .waitFor();
  record(
    "atualização confirmada no PostgreSQL",
    (
      await fixture.control.query(
        "SELECT name FROM venda.organizations WHERE id=$1",
        [orgA.split("/").at(-1)],
      )
    ).rows[0].name === "DEMO_ONLY — Equipe A revisada",
  );
  const contextB = await browser.newContext({ locale: "pt-BR" });
  const pageB = await contextB.newPage();
  await login(pageB, "DEMO_ONLY-owner-B");
  const orgB = await createOrg(pageB, "DEMO_ONLY — Equipe B");
  await goto(pageB, orgA);
  record(
    "B não recebe dados de A na URL",
    (await pageB
      .getByRole("heading", { name: "Conteúdo não encontrado" })
      .isVisible()) &&
      !(await pageB.locator("body").innerText()).includes("Equipe A"),
  );
  await goto(page, orgB);
  record(
    "A não recebe dados de B na URL",
    (await page
      .getByRole("heading", { name: "Conteúdo não encontrado" })
      .isVisible()) &&
      !(await page.locator("body").innerText()).includes("Equipe B"),
  );
  await goto(page, "/app");
  record(
    "lista de organizações não mistura tenants",
    !(await page.locator("main").innerText()).includes("Equipe B"),
  );
  const viewerContext = await browser.newContext();
  const viewerPage = await viewerContext.newPage();
  await login(viewerPage, "DEMO_ONLY-viewer");
  const userId = (
    await fixture.control.query("SELECT id FROM venda.users WHERE subject=$1", [
      idp.real?idp.subject('DEMO_ONLY-viewer'):"DEMO_ONLY-viewer",
    ])
  ).rows[0].id;
  await fixture.control.query(
    "INSERT INTO venda.memberships (organization_id,user_id,role) VALUES ($1,$2,$3)",
    [orgA.split("/").at(-1), userId, "viewer"],
  );
  await goto(viewerPage, orgA + "/configuracoes/organizacao");
  record(
    "viewer vê 403 e não recebe formulário de mutação",
    (await viewerPage
      .getByRole("heading", { name: "Acesso não permitido" })
      .isVisible()) &&
      (await viewerPage
        .getByRole("button", { name: "Salvar organização" })
        .count()) === 0,
  );
  await axe(viewerPage, "viewer 403");
  await shot(viewerPage, "app-viewer-403");
  await fixture.control.query(
    "UPDATE venda.memberships SET active=false WHERE user_id=$1",
    [userId],
  );
  await goto(viewerPage, orgA);
  record(
    "revogação de membership reflete após navegação",
    await viewerPage
      .getByRole("heading", { name: "Conteúdo não encontrado" })
      .isVisible(),
  );
  const forged = await context.request.post(base + "/app", {
    headers: {
      Origin: "https://invasor.invalid",
      "Next-Action": "invalid-action",
    },
    data: "{}",
  });
  record("mutação de origem externa recusada", forged.status() >= 400);
  const response = await context.request.get(base + "/entrar");
  record(
    "CSP sem unsafe-eval em build produtivo",
    response.headers()["content-security-policy"]?.includes("'nonce-") &&
      !response.headers()["content-security-policy"].includes("unsafe-eval"),
  );
  record(
    "respostas privadas não são cacheadas",
    (await context.request.get(base + "/app"))
      .headers()
      ["cache-control"]?.includes("no-store"),
  );
  // Lab p75/p95: warmed desktop, unthrottled loopback. Independent from field RUM.
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const route of ["/", "/entrar", orgA])
    for (let n = 0; n < 5; n++) {
      await goto(page, route);
      const timing = await page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0];
        const paints = performance.getEntriesByType("paint");
        return {
          ttfb: nav.responseStart,
          fcp:
            paints.find((p) => p.name === "first-contentful-paint")
              ?.startTime ?? null,
        };
      });
      samples.push({
        route: route === orgA ? "app-shell-DEMO_ONLY" : route,
        iteration: n + 1,
        ...timing,
      });
      vitals.push(...(await page.evaluate(() => window.__vendaVitals)));
    }
  // DEMO_ONLY fault transport, outside app source: verifies unknown results are not shown as success.
  const realApi = process.env.VENDA_API_INTERNAL_ORIGIN;
  const stalled = createServer(() => {});
  const faultPort = await freePort();
  await new Promise((resolve) =>
    stalled.listen(faultPort, "127.0.0.1", resolve),
  );
  try {
    process.env.VENDA_API_INTERNAL_ORIGIN = `http://127.0.0.1:${faultPort}`;
    await pageB.goto(base + "/app", { waitUntil: "commit", timeout: 60000 });
    await pageB
      .getByRole("heading", {
        name: "A confirmação demorou mais que o esperado",
      })
      .waitFor({ timeout: 20000 });
    record(
      "timeout real de transporte apresenta 504 sem sucesso inventado",
      await pageB
        .getByRole("heading", {
          name: "A confirmação demorou mais que o esperado",
        })
        .isVisible(),
    );
    await shot(pageB, "api-timeout");
  } finally {
    process.env.VENDA_API_INTERNAL_ORIGIN = realApi;
    stalled.closeAllConnections();
    await new Promise((resolve) => stalled.close(resolve));
  }
  await goto(page, orgA);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await page.waitForURL(base + "/entrar");
  await goto(page, "/app");
  record(
    "logout revoga sessão e interface privada",
    await page
      .getByRole("heading", { name: "Sua sessão precisa ser renovada" })
      .isVisible(),
  );
  await goto(pageB, orgB + "/configuracoes/organizacao");
  await pageB
    .getByLabel("Nome da organização (obrigatório)")
    .fill("DEMO_ONLY — edição não confirmada");
  await runtime.close();
  runtime = undefined;
  await pageB.getByRole("button", { name: "Salvar organização" }).click();
  await pageB.locator('form [role="alert"]').waitFor();
  record(
    "falha de alteração preserva rascunho e não modifica o banco",
    (await pageB
      .getByLabel("Nome da organização (obrigatório)")
      .inputValue()) === "DEMO_ONLY — edição não confirmada" &&
      (
        await fixture.control.query(
          "SELECT name FROM venda.organizations WHERE id=$1",
          [orgB.split("/").at(-1)],
        )
      ).rows[0].name === "DEMO_ONLY — Equipe B",
  );
  await shot(pageB, "formulario-falha-rascunho");
  await pageB.getByRole("button", { name: "Sair", exact: true }).click();
  await pageB.waitForURL(base + "/entrar?estado=saida-pendente");
  record(
    "logout offline remove cookie local e informa revogação não confirmada",
    !(await contextB.cookies()).some(
      (c) => c.name === "__Host-venda_session",
    ) &&
      (await pageB
        .getByText("O acesso foi removido deste navegador.", { exact: false })
        .isVisible()),
  );
  await goto(pageB, "/app");
  record(
    "falha da API tem estado explícito sem dados antigos",
    (await pageB
      .getByRole("heading", { name: "Serviço temporariamente indisponível" })
      .isVisible()) &&
      !(await pageB.locator("main").innerText()).includes("Equipe B"),
  );
  await shot(pageB, "api-indisponivel");
  record(
    "sem erros de hidratação ou JavaScript",
    pageErrors.length === 0,
    pageErrors,
  );
  const quantile = (values, p) =>
    values.sort((a, b) => a - b)[Math.ceil(values.length * p) - 1];
  fs.writeFileSync(
    path.join(output, "performance.json"),
    JSON.stringify(
      {
        executedAt: new Date().toISOString(),
        browser: browser.version(),
        cpu: os.cpus()[0]?.model,
        memoryBytes: os.totalmem(),
        environment:
          "Windows loopback, production Next build; desktop 1440x1000, unthrottled; cache browser warm, no private response cache; no external calls except local test IdP",
        sampleCountPerRoute: 5,
        fieldRum: false,
        summaries: [...new Set(samples.map((s) => s.route))].map((route) => {
          const own = samples.filter((s) => s.route === route);
          return {
            route,
            fcpP75: quantile(
              own.map((s) => s.fcp),
              0.75,
            ),
            fcpP95: quantile(
              own.map((s) => s.fcp),
              0.95,
            ),
            ttfbP75: quantile(
              own.map((s) => s.ttfb),
              0.75,
            ),
          };
        }),
        samples,
        localWebVitalsEvents: vitals,
      },
      null,
      2,
    ) + "\n",
  );
  }
} catch (error) {
  const diagnosticPage=activePage?new URL(activePage.url()):null;fs.writeFileSync(path.join(output,'login-diagnostico.json'),JSON.stringify({page:diagnosticPage?{origin:diagnosticPage.origin,path:diagnosticPage.pathname}:null,responses:authDiagnostics.slice(-20),api:apiDiagnostics.slice(-10)},null,2));
  if(activePage)await activePage.screenshot({path:path.join(output,'login-falha.png'),fullPage:false}).catch(()=>{});
  record("execução completa do harness", false, error.message);
} finally {
  if(worker&&worker.exitCode===null&&worker.signalCode===null){await new Promise(resolve=>{worker.once('exit',resolve);worker.kill('SIGTERM');setTimeout(resolve,3000).unref();});}
  if (browser) await browser.close();
  if (web) {
    web.closeAllConnections();
    await new Promise((resolve) => web.close(resolve));
  }
  if (nextApp) await nextApp.close();
  if (runtime) await runtime.close().catch(() => {});
  if (idp) await idp.close().catch(error => record('limpeza do provedor de teste',false,error.message));
  if (fixture) await fixture.stop().catch(error=>record('limpeza do cluster de teste',false,error.message));
  process.chdir(root);
  fs.writeFileSync(
    path.join(output, "browser.json"),
    JSON.stringify(
      {
        executedAt: new Date().toISOString(),
        fixture: idp?.real ? "DEMO_ONLY: PostgreSQL real isolado e Keycloak real em realm temporário; nenhum dado no ambiente persistente do usuário" : "DEMO_ONLY real PostgreSQL and signed OIDC local protocol simulator, no external provider sandbox",
        realOidcExecuted: idp?.real === true,
        suiteMode:process.env.VENDA_WEB_OIDC_SMOKE_ONLY==='true'?'oidc_smoke':'full',
        postgresVersion: fixture?.version ?? null,
        outcomes,
        screenshots,
        passed:
          outcomes.length > 0 && outcomes.every((o) => o.status === "PASS"),
        externalProviderSandboxExecuted: false,
        productionDeployed: false,
      },
      null,
      2,
    ) + "\n",
  );
}
console.log(
  `${outcomes.filter((o) => o.status === "PASS").length} PASS, ${outcomes.filter((o) => o.status === "FAIL").length} FAIL`,
);
process.exitCode = outcomes.some((o) => o.status === "FAIL") ? 1 : 0;
