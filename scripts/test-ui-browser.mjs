import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { serve } from './serve-ui.mjs';

const output='docs/ui/evidencias';fs.mkdirSync(`${output}/telas`,{recursive:true});
const {routes}=JSON.parse(fs.readFileSync('docs/ux/routes.json','utf8'));
const servers=[];let browser;let browserVersion;const checks=[];const screenshots=[];const consoleErrors=[];const externalRequests=[];
const base='http://127.0.0.1:3100';
const executablePath=process.env.UI_CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe';
const record=(name,ok,detail)=>{checks.push({name,status:ok?'PASS':'FAIL',...(detail?{detail}:{})});if(!ok)console.log(`FAIL ${name}: ${detail}`);};
async function axe(page,label){const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();record(`axe ${label}`,result.violations.length===0,result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})));}
async function shot(page,name){const file=`${output}/telas/${name}.png`;await page.screenshot({path:file,fullPage:true,animations:'disabled'});screenshots.push(file);return file;}
async function ready(page,url){await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);}
try{
  servers.push(await serve('sandbox/ui-review/out',3100));
  servers.push(await serve('storybook-static',6006));
  browser=await chromium.launch({executablePath,headless:true});
  browserVersion=browser.version();
  const context=await browser.newContext({reducedMotion:'reduce',locale:'pt-BR',timezoneId:'America/Sao_Paulo'});
  context.on('request',r=>{if(!/^https?:\/\/127\.0\.0\.1:/.test(r.url())&&!r.url().startsWith('data:'))externalRequests.push(r.url());});
  const page=await context.newPage();page.on('pageerror',error=>consoleErrors.push(error.message));
  for(const size of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}]){
    await page.setViewportSize(size);
    for(const r of routes){
      await ready(page,`${base}/telas/${r.id}/`);
      record(`Título ${r.id} ${size.name}`,await page.locator('h1').count()===1);
      record(`Sem overflow ${r.id} ${size.name}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      record(`Inter carregada ${r.id} ${size.name}`,await page.evaluate(()=>document.fonts.check('16px "Inter Variable"')));
      await axe(page,`${r.id} ${size.name}`);
      await shot(page,`${r.id}-${size.name}`);
    }
    for(const path of ['identidade','componentes']){await ready(page,`${base}/${path}/`);await axe(page,`${path} ${size.name}`);await shot(page,`${path}-${size.name}`);}
    for(const id of ['APP03','ADM02']){await ready(page,`${base}/telas/${id}/`);await page.evaluate(()=>document.documentElement.dataset.theme='dark');await axe(page,`${id} dark ${size.name}`);await shot(page,`${id}-dark-${size.name}`);}
  }
  await page.setViewportSize({width:1024,height:768});
  for(const id of ['APP03','APP16','ADM03']){await ready(page,`${base}/telas/${id}/`);record(`Sem overflow tablet ${id}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await axe(page,`${id} tablet`);await shot(page,`${id}-tablet`);}
  await page.setViewportSize({width:320,height:800});
  for(const id of ['PUB01','APP03','APP16','ADM02']){await ready(page,`${base}/telas/${id}/`);record(`Reflow 320 ${id}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  await page.setViewportSize({width:1440,height:1000});
  await ready(page,`${base}/componentes/`);
  await page.getByRole('button',{name:'Abrir diálogo',exact:true}).click();
  const dialog=page.getByRole('dialog');record('Modal nativo abre',await dialog.isVisible());
  await page.keyboard.press('Tab');record('Tab permanece no modal',await page.evaluate(()=>!!document.querySelector('dialog')?.contains(document.activeElement)));
  await page.keyboard.press('Shift+Tab');record('Shift Tab permanece no modal',await page.evaluate(()=>!!document.querySelector('dialog')?.contains(document.activeElement)));
  await axe(page,'modal aberto');await shot(page,'modal-desktop');
  await page.keyboard.press('Escape');record('Escape fecha modal',!(await dialog.isVisible()));
  record('Foco retorna ao acionador',await page.getByRole('button',{name:'Abrir diálogo',exact:true}).evaluate(el=>el===document.activeElement));
  await page.getByRole('button',{name:'Exibir notificação',exact:true}).click();record('Toast é anunciado',await page.getByRole('status').filter({hasText:'Exemplo DEMO_ONLY concluído.'}).isVisible());await page.getByRole('button',{name:'Dispensar notificação'}).click();
  await ready(page,`${base}/telas/APP05/`);await page.getByRole('button',{name:'Meus contatos'}).focus();await page.keyboard.press('Enter');record('Filtro por teclado',await page.getByRole('button',{name:'Meus contatos'}).getAttribute('aria-pressed')==='true');
  await page.setViewportSize({width:390,height:844});await ready(page,`${base}/telas/APP03/`);await page.getByRole('button',{name:'Abrir navegação'}).click();record('Menu mobile abre',await page.getByRole('navigation',{name:'Navegação do cliente'}).isVisible());await page.getByRole('button',{name:'Fechar navegação'}).click();
  await context.tracing.stop({path:`${output}/interacoes-playwright.zip`});
  await page.setViewportSize({width:1440,height:1000});
  const stateStories=['carregando','vazio','erro','permissao-negada','timeout','sucesso','desatualizado'];
  for(const state of stateStories){
    await ready(page,`http://127.0.0.1:6006/iframe.html?id=design-system-componentes--${state}&viewMode=story`);
    await page.waitForSelector('#storybook-root > *');
    record(`Story ${state} renderizada`,(await page.locator('#storybook-root').innerText()).trim().length>10);
    await axe(page,`Story ${state}`);await shot(page,`estado-${state}`);
  }
  // Repetibilidade visual, baseline local capturado nesta mesma execução.
  await ready(page,`${base}/telas/APP03/`);const first=await page.screenshot({fullPage:true,animations:'disabled'});await page.reload({waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);const second=await page.screenshot({fullPage:true,animations:'disabled'});
  const a=PNG.sync.read(first),b=PNG.sync.read(second),diff=new PNG({width:a.width,height:a.height});const changed=pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:0.1});fs.writeFileSync(`${output}/diff-repetibilidade.png`,PNG.sync.write(diff));record('Diff repetibilidade APP03 desktop',changed===0,{changedPixels:changed,totalPixels:a.width*a.height,scope:'Duas capturas locais da mesma versão; não é comparação com baseline aprovado.'});
  await ready(page,`${base}/identidade/`);const side=await shot(page,'comparacao-brandboard');record('Comparação visual contém PNG original',await page.locator('img[alt^="Brandboard"]').evaluate(el=>el.complete&&el.naturalWidth>0),side);
  record('Sem chamadas externas nas telas',externalRequests.length===0,externalRequests);
  record('Sem exceções JavaScript no navegador',consoleErrors.length===0,consoleErrors);
}catch(error){record('Execução do navegador',false,error.stack);}
finally{
  if(browser)await browser.close();for(const s of servers)await new Promise(r=>s.close(r));
  const report={executedAt:new Date().toISOString(),browserExecutable:executablePath,browserVersion,conditions:{host:'Windows local',network:'loopback, sem throttling',cache:'contexto novo; fontes aguardadas',locale:'pt-BR',timezone:'America/Sao_Paulo',reducedMotion:true},checks,screenshots,limits:['axe não certifica WCAG completa.','Sem baseline visual aprovado; diff executado mede apenas repetibilidade.','Screenshots não medem performance de campo.','Nenhuma integração produtiva ou dado de cliente.']};
  fs.writeFileSync(`${output}/browser.json`,JSON.stringify(report,null,2)+'\n');
  const failures=checks.filter(c=>c.status==='FAIL');console.log(`${checks.length-failures.length} PASS, ${failures.length} FAIL; ${screenshots.length} capturas.`);process.exitCode=failures.length?1:0;
}
