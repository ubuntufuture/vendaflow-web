import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const release=process.argv.includes('--release');
const checks=[];
const check=(name,fn)=>{try{fn();checks.push({name,status:'PASS'});}catch(error){checks.push({name,status:'FAIL',reason:error.message});}};
const {routes,coverageOfPrd}=JSON.parse(fs.readFileSync('docs/ux/routes.json','utf8'));
const {sources}=JSON.parse(fs.readFileSync('docs/ux/fontes.json','utf8'));
const wireframes=fs.readFileSync('docs/ux/04-wireframes-e-estados.md','utf8');
const stories=fs.readFileSync('docs/ux/07-historias-e-backlog.md','utf8');
const expectedStates=['loading','empty','error','forbidden','timeout','success'];
const allowedRoles=['visitante','responsavel','gestor','atendente','financeiro_cliente','suporte_interno','financeiro_interno','auditor_interno'];
check('IDs e rotas únicos por superfície',()=>{
  assert.equal(new Set(routes.map(r=>r.id)).size,routes.length);
  assert.equal(new Set(routes.map(r=>`${r.surface}:${r.path}`)).size,routes.length);
});
check('Todas as rotas candidatas têm estados, wireframes e histórias existentes',()=>{
  for(const r of routes){
    assert(expectedStates.every(s=>r.states.includes(s)),r.id);
    assert(wireframes.includes(`## ${r.wireframe} `),`Wireframe ausente: ${r.id}`);
    for(const story of r.stories) assert(stories.includes(`| ${story} `),`História ausente: ${r.id}`);
    assert(['P0','P1','P2'].includes(r.priority),r.id);
    assert.equal(r.prdMapping,null,`Mapeamento PRD não demonstrado: ${r.id}`);
    assert.equal(r.status,'proposta_nao_implementada');
  }
});
check('Separação de público, cliente e admin e papéis explícitos',()=>{
  for(const surface of ['public','app','admin']) assert(routes.some(r=>r.surface===surface));
  for(const r of routes){
    assert(r.roles.length>0&&r.roles.every(role=>allowedRoles.includes(role)),r.id);
    if(r.surface==='admin')assert(r.roles.every(role=>role.endsWith('_interno')),r.id);
    if(r.surface==='app')assert(r.roles.every(role=>!role.endsWith('_interno')&&role!=='visitante'),r.id);
  }
});
check('Todos os exports classificados sem fonte de rota órfã',()=>{
  const actual=fs.readdirSync('referencias/stitch_venda_flow_design_system',{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name).sort();
  assert.deepEqual(sources.map(s=>s.export).sort(),actual);
  for(const s of sources){
    assert.equal(s.trustedForProduction,false);
    if(s.route){assert(routes.some(r=>r.id===s.route),s.export);}
    else assert.equal(s.classification,'referencia_de_marca');
  }
  for(const r of routes) for(const s of r.sources) assert(sources.some(x=>x.export===s&&x.route===r.id),r.id);
});
check('Integridade SHA256 de todos os arquivos de referência',()=>{
  for(const s of sources)for(const f of s.files){
    const bytes=fs.readFileSync(f.path);
    assert.equal(bytes.length,f.bytes,f.path);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),f.sha256,f.path);
  }
});
check('Links locais dos documentos apontam para arquivos existentes',()=>{
  const docs=['README.md',...fs.readdirSync('docs/ux').filter(n=>n.endsWith('.md')).map(n=>`docs/ux/${n}`)];
  for(const file of docs){
    const content=fs.readFileSync(file,'utf8');
    for(const match of content.matchAll(/\]\(([^)]+)\)/g)){
      const target=match[1];if(/^(https?:|#)/.test(target))continue;
      const dir=file.includes('/')?file.slice(0,file.lastIndexOf('/')):'.';
      assert(fs.existsSync(`${dir}/${target.split('#')[0]}`),`${file}: ${target}`);
    }
  }
});
check('Fontes brutas em quarentena fora de runtime',()=>{
  assert(fs.readFileSync('.gitignore','utf8').includes('/referencias/stitch_venda_flow_design_system/'));
  for(const dir of ['public','apps','src'])assert(!fs.existsSync(dir),`Revisar destino de produção: ${dir}`);
});

const luminance=(hex)=>{
  const c=hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);
  return c[0]*0.2126+c[1]*0.7152+c[2]*0.0722;
};
const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
check('Cálculo de contraste confere pares de referência conhecidos',()=>{
  assert.equal(ratio('#FFFFFF','#FFFFFF'),1);
  assert(Math.abs(ratio('#000000','#FFFFFF')-21)<0.00001);
});
const pairs=[['branco sobre coral','#FFFFFF','#FF6A4D'],['obsidiana sobre coral','#0B0E14','#FF6A4D'],['obsidiana sobre marfim','#0B0E14','#FFF9F6'],['cinza claro sobre branco','#E6E8EC','#FFFFFF']];
const contrast=pairs.map(([name,foreground,background])=>{const raw=ratio(foreground,background);return {name,foreground,background,ratio:Number(raw.toFixed(3)),normalTextAA:raw>=4.5,largeTextAA:raw>=3,essentialNonTextCandidate:raw>=3};});
const required=[
  'referencias/00_ARQUITETURA_GERAL.md',
  'referencias/03_SEGURANCA_E_GOVERNANCA.md',
  'referencias/venda-openapi.yaml',
  'branding/tokens.json',
  'branding/brandboard.png',
];
const missing=required.filter(p=>!fs.existsSync(p));
// PRD não tem nome fornecido. Quando obtido, registrar o caminho e mapear V01–V24 em revisão explícita.
const blockers=[...missing,'PRD V01–V24 não fornecido ou reconciliado','Aprovação do conteúdo dos contratos e cobertura P0 contra PRD pendente'];
if(release){
  check('Referências obrigatórias presentes',()=>assert.equal(missing.length,0,missing.join(', ')));
  check('Cobertura P0 confirmada contra PRD V01–V24',()=>assert.equal(coverageOfPrd,'validada_contra_prd','PRD ausente; cobertura não comprovada'));
}
const result={kind:'verificacao_documental_ux',executedAt:new Date().toISOString(),mode:release?'release':'documental',checks,
  candidateRoutes:routes.length,candidateP0:routes.filter(r=>r.priority==='P0').length,
  candidateP0StateCoverage:routes.filter(r=>r.priority==='P0'&&expectedStates.every(s=>r.states.includes(s))).length,
  exports:sources.length,sourceFiles:sources.reduce((n,s)=>n+s.files.length,0),coverageOfPrd,blockers,
  runtimeTestsExecuted:false,stageComplete:false};
fs.mkdirSync('docs/ux/evidencias',{recursive:true});
fs.writeFileSync('docs/ux/evidencias/contraste.json',JSON.stringify({method:'WCAG relative luminance sRGB, solid colors; no UI compliance claim',pairs:contrast},null,2)+'\n');
fs.writeFileSync(`docs/ux/evidencias/${release?'gate-release':'verificacao-documental'}.json`,JSON.stringify(result,null,2)+'\n');
for(const c of checks)console.log(`${c.status}: ${c.name}${c.reason?` — ${c.reason}`:''}`);
console.log(`${result.candidateRoutes} rotas candidatas; ${result.candidateP0StateCoverage}/${result.candidateP0} P0 candidatas com estados; ${result.sourceFiles} fontes. PRD: ${coverageOfPrd}.`);
console.log('Contraste:',contrast.map(c=>`${c.name} ${c.ratio}:1`).join('; '));
process.exitCode=checks.some(c=>c.status==='FAIL')?1:0;
