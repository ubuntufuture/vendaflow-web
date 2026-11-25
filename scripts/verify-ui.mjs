import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const release=process.argv.includes('--release');
const checks=[];
function check(name,fn){try{fn();checks.push({name,status:'PASS'});}catch(error){checks.push({name,status:'FAIL',reason:error.message});}}
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const {routes}=read('docs/ux/routes.json');
const browser=read('docs/ui/evidencias/browser.json');
const unit=read('docs/ui/evidencias/unitarios.json');
const security=read('docs/ui/evidencias/tokens-e-seguranca.json');
const audit=read('docs/ui/evidencias/npm-audit.json');
check('Testes de componentes sem falha',()=>{assert.equal(unit.numFailedTests,0);assert(unit.numPassedTests>=20);});
check('Verificações reais de navegador sem falha',()=>{assert(browser.checks.length>=350);assert(browser.checks.every(c=>c.status==='PASS'));});
check('Paleta, contraste, origem do PNG e controles estáticos passam',()=>assert(security.checks.every(c=>c.status==='PASS')));
check('Todas as rotas candidatas P0 têm captura desktop e mobile',()=>{for(const r of routes.filter(r=>r.priority==='P0'))for(const size of ['desktop','mobile'])assert(browser.screenshots.includes(`docs/ui/evidencias/telas/${r.id}-${size}.png`),r.id);});
check('Cada estado tem cenário Storybook capturado',()=>{for(const state of ['carregando','vazio','erro','permissao-negada','timeout','sucesso','desatualizado'])assert(fs.existsSync(`docs/ui/evidencias/telas/estado-${state}.png`));});
check('Trace, comparação e diff visual existem',()=>{for(const file of ['interacoes-playwright.zip','diff-repetibilidade.png','telas/comparacao-brandboard.png'])assert(fs.statSync(`docs/ui/evidencias/${file}`).size>0);});
check('Builds estáticos Next e Storybook completos',()=>{assert(fs.existsSync('sandbox/ui-review/.next/BUILD_ID'));assert(fs.existsSync('sandbox/ui-review/out/referencia/brandboard.png'));const entries=Object.values(read('storybook-static/index.json').entries);assert.equal(entries.filter(e=>e.type==='story').length,92);});
check('Nenhuma vulnerabilidade conhecida no npm audit final',()=>assert.equal(audit.metadata.vulnerabilities.total,0));
check('Lighthouse registra todos os perfis e amostras sem substituir RUM',()=>{const p=read('docs/ui/evidencias/performance.json');assert.equal(p.runs.length,30);for(const row of p.summaries)assert.equal(row.samples,5);});
check('Budget laboratorial LCP e CLS por rota',()=>{const p=read('docs/ui/evidencias/performance.json');const b=read('docs/ui/budgets.json');for(const row of p.summaries){assert(row.lcpP75<=b.lcpP75Ms,`${row.profile} ${row.route}: LCP p75 ${row.lcpP75} ms`);assert(row.clsP75<=b.clsP75,`${row.route}: CLS ${row.clsP75}`);}});
check('Analyzer oficial possui relatório cliente',()=>assert(fs.statSync('docs/ui/evidencias/bundle-analyzer/client.html').size>0));
const required=['referencias/00_ARQUITETURA_GERAL.md','referencias/03_SEGURANCA_E_GOVERNANCA.md','referencias/venda-openapi.yaml'];
const missing=required.filter(file=>!fs.existsSync(file));
if(release){
  check('Referências arquiteturais e contratos obrigatórios presentes',()=>assert.equal(missing.length,0,missing.join(', ')));
  check('Cobertura P0 validada contra PRD V01–V24',()=>assert.equal(read('docs/ux/routes.json').coverageOfPrd,'validada_contra_prd'));
}
const report={executedAt:new Date().toISOString(),mode:release?'release':'revisao-ui',checks,stageComplete:false,
  blockers:[...missing,'PRD V01–V24 e rastreabilidade P0 ausentes','SVG oficial validado não fornecido; placeholder tipográfico explicitamente autorizado'],
  productionClaims:{rum:false,apiContractsValidated:false,authorizationImplemented:false,billingIntegrated:false,channelIntegrated:false,officialLogoApproved:false}};
fs.writeFileSync(`docs/ui/evidencias/${release?'gate-release':'verificacao-ui'}.json`,JSON.stringify(report,null,2)+'\n');
const inventory=routes.map(r=>({id:r.id,title:r.title,priority:r.priority,surface:r.surface,proposedProductPath:r.path,reviewPath:`/telas/${r.id}/`,captures:['desktop','mobile'].map(size=>`docs/ui/evidencias/telas/${r.id}-${size}.png`)}));
fs.writeFileSync('docs/ui/telas.json',JSON.stringify(inventory,null,2)+'\n');
const table=inventory.map(r=>`| ${r.id} | ${r.title} | ${r.priority} | [Desktop](evidencias/telas/${r.id}-desktop.png) | [Mobile](evidencias/telas/${r.id}-mobile.png) |`).join('\n');
fs.writeFileSync('docs/ui/TELAS.md',`# Telas da etapa UI\n\n39 telas candidatas, incluindo 37 P0 e duas P1. Caminhos de produto são propostas da UX; o sandbox usa somente /telas/ID. Sem dados de clientes, preços ou métricas fictícias. A cobertura total do PRD continua indeterminada.\n\n| ID | Tela | Prioridade | Desktop 1440 | Mobile 390 |\n| --- | --- | --- | --- | --- |\n${table}\n`);
const tracked=[];function collect(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const name=`${dir}/${d.name}`;if(d.isDirectory()){if(!['node_modules','.next','out','evidencias'].includes(d.name))collect(name);}else tracked.push(name);}}
for(const dir of ['branding','packages/ui','sandbox/ui-review','.storybook'])collect(dir);
fs.writeFileSync('docs/ui/evidencias/fontes-ui-sha256.json',JSON.stringify(tracked.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')})),null,2)+'\n');
for(const c of checks)console.log(`${c.status}: ${c.name}${c.reason?` — ${c.reason}`:''}`);
process.exitCode=checks.some(c=>c.status==='FAIL')?1:0;
