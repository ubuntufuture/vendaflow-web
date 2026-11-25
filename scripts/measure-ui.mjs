import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { gzipSync } from 'node:zlib';
import lighthouse from 'lighthouse';
import desktop from 'lighthouse/core/config/desktop-config.js';
import { launch } from 'chrome-launcher';
import { serve } from './serve-ui.mjs';

const out='docs/ui/evidencias';fs.mkdirSync(`${out}/lighthouse`,{recursive:true});
const server=await serve('sandbox/ui-review/out',3100);let chrome;const runs=[];
const samples=5;
const profiles=[
  {name:'desktop',config:desktop},
  {name:'mobile-rede-restrita',config:{extends:'lighthouse:default',settings:{formFactor:'mobile',screenEmulation:{mobile:true,width:390,height:844,deviceScaleFactor:1,disabled:false},throttlingMethod:'simulate',throttling:{rttMs:150,throughputKbps:1600,cpuSlowdownMultiplier:4,requestLatencyMs:150,downloadThroughputKbps:1600,uploadThroughputKbps:750}}}},
];
try{
  chrome=await launch({chromePath:process.env.UI_CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',chromeFlags:['--headless','--disable-gpu','--no-first-run']});
  for(const profile of profiles)for(const route of ['PUB01','APP03','ADM02'])for(let i=0;i<samples;i++){
    const result=await lighthouse(`http://127.0.0.1:3100/telas/${route}/`,{port:chrome.port,logLevel:'error',onlyCategories:['performance'],output:'json'},profile.config);
    if(!result||result.lhr.runtimeError)throw new Error(JSON.stringify(result?.lhr.runtimeError));
    const lhr=result.lhr;
    fs.writeFileSync(`${out}/lighthouse/${profile.name}-${route}-${i+1}.json.gz`,gzipSync(JSON.stringify(lhr)));
    runs.push({route,profile:profile.name,run:i+1,performanceScore:lhr.categories.performance.score,
      fcp:lhr.audits['first-contentful-paint'].numericValue,lcp:lhr.audits['largest-contentful-paint'].numericValue,
      cls:lhr.audits['cumulative-layout-shift'].numericValue,tbt:lhr.audits['total-blocking-time'].numericValue,
      speedIndex:lhr.audits['speed-index'].numericValue,settings:lhr.configSettings,environment:lhr.environment,
      warnings:lhr.runWarnings});
    console.log(`${profile.name} ${route} ${i+1}/${samples}: FCP ${runs.at(-1).fcp.toFixed(0)} ms; LCP ${runs.at(-1).lcp.toFixed(0)} ms`);
  }
}finally{if(chrome)await chrome.kill();await new Promise(resolve=>server.close(resolve));}
const percentile=(values,p)=>{const sorted=[...values].sort((a,b)=>a-b);const index=(sorted.length-1)*p;const lower=Math.floor(index),upper=Math.ceil(index);return Number((sorted[lower]+(sorted[upper]-sorted[lower])*(index-lower)).toFixed(3));};
const summaries=profiles.flatMap(profile=>['PUB01','APP03','ADM02'].map(route=>{const rows=runs.filter(r=>r.route===route&&r.profile===profile.name);return {route,profile:profile.name,samples:rows.length,fcpP75:percentile(rows.map(r=>r.fcp),.75),fcpP95:percentile(rows.map(r=>r.fcp),.95),lcpP75:percentile(rows.map(r=>r.lcp),.75),lcpP95:percentile(rows.map(r=>r.lcp),.95),clsP75:percentile(rows.map(r=>r.cls),.75),tbtP75:percentile(rows.map(r=>r.tbt),.75)};}));
const files=[];function walk(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,d.name);if(d.isDirectory())walk(p);else if(/\.(js|css|woff2)$/.test(p)){const b=fs.readFileSync(p);files.push({file:p.replaceAll('\\','/'),bytes:b.length,gzipBytes:gzipSync(b).length});}}}walk('sandbox/ui-review/out/_next');
const report={executedAt:new Date().toISOString(),host:{platform:process.platform,node:process.version,cpu:os.cpus()[0]?.model,logicalCores:os.cpus().length,memoryBytes:os.totalmem()},conditions:{location:'Máquina local do workspace Windows, timezone São Paulo informado pelo cliente; localização física não aferida e não é borda AWS.',network:'Origem loopback com simulação Lighthouse; rede real e dispositivo de campo não aferidos. Settings detalhados por execução.',cache:'Lighthouse limpa storage/cache entre navegações por padrão; sem sessão autenticada.',samplesPerRoutePerProfile:samples,percentile:'interpolação linear de amostra pequena, descritiva, sem inferência de campo'},runs,summaries,staticFiles:files,limits:['Apenas catálogo UI estático; não mede operação produtiva.','FCP não é a métrica primeiro conteúdo útil; nenhuma garantia de 1s.','Sem RUM, INP real ou baseline de regressão aprovado.','Dispositivos reais, rede de campo e APIs ainda exigem baseline de produto.']};
fs.writeFileSync(`${out}/performance.json`,JSON.stringify(report,null,2)+'\n');
const table=summaries.map(r=>`| ${r.route} | ${r.profile} | ${r.samples} | ${r.fcpP75} | ${r.fcpP95} | ${r.lcpP75} | ${r.lcpP95} | ${r.clsP75} | ${r.tbtP75} |`).join('\n');
const baseline=fs.existsSync(`${out}/performance-baseline-client.json`)?JSON.parse(fs.readFileSync(`${out}/performance-baseline-client.json`,'utf8')):null;
const comparison=baseline?summaries.map(r=>{const before=baseline.summaries.find(b=>b.route===r.route&&b.profile===r.profile);return `| ${r.route} | ${r.profile} | ${before?.tbtP75??'N/A'} | ${r.tbtP75} |`;}).join('\n'):'';
fs.writeFileSync('docs/ui/PERFORMANCE.md',`# Performance do catálogo UI\n\nLaboratório local em ${report.executedAt}, Node ${process.version}, ${report.host.cpu}. São 30 navegações Lighthouse, cinco por rota/perfil. Desktop usa o preset oficial; mobile/rede restrita usa 390×844, RTT simulado 150 ms, down 1600 Kbps, up 750 Kbps, CPU 4×. Origem loopback, cache/storage limpos pelo Lighthouse. Não existe sessão autenticada nem integração externa. Configurações, versões e condições completas estão em [performance.json](evidencias/performance.json); relatórios originais comprimidos em evidencias/lighthouse.\n\nPercentis por interpolação linear, amostra pequena descritiva. FCP/LCP/TBT em ms; CLS adimensional. FCP não substitui primeiro conteúdo útil; TBT não substitui INP. Nenhum dado abaixo comprova RUM ou o desempenho da plataforma produtiva.\n\n| Rota | Perfil | n | FCP p75 | FCP p95 | LCP p75 | LCP p95 | CLS p75 | TBT p75 |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${table}\n\n## Comparação local antes e depois da separação server/client\n\nA baseline foi medida na mesma máquina, com as mesmas configurações e cinco amostras por grupo, antes da separação das telas em Server Components. Não é baseline produtiva aprovada; diferenças pequenas podem ser variação de laboratório.\n\n| Rota | Perfil | TBT p75 antes em ms | TBT p75 final em ms |\n| --- | --- | --- | --- |\n${comparison}\n\n## Limites e gates\n\nBudgets laboratoriais por rota: LCP p75 ≤2500 ms e CLS p75 ≤0,1, verificados por verify-ui.mjs. A meta aspiracional de primeiro conteúdo útil ≤1000 ms não foi verificada com essa métrica. INP real, RUM por segmento, APIs p95, carga/dataset e borda regional são N/A neste sandbox e permanecem pendentes para o produto. TBT mobile deve ser acompanhado; não representa latência de teclado medida com usuários.\n\nO analyzer oficial do Next gerou [client.html](evidencias/bundle-analyzer/client.html), nodejs.html e edge.html; edge não tem bundle executável neste export. Inventário de bytes/gzip de todos os assets está em performance.json, sem confundir soma de arquivos com transferência por rota. Storybook tem chunks grandes de documentação/axe, exclusivos da ferramenta e ausentes do entrypoint de componentes.\n`);
console.log(JSON.stringify(summaries,null,2));
