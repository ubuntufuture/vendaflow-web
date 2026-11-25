import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const t=JSON.parse(fs.readFileSync('branding/tokens.json','utf8'));
const allowed=new Set(Object.values(t.primitive).map(v=>v.toUpperCase()));
const results=[];
const check=(name,fn)=>{try{fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',reason:e.message});}};
const lum=h=>{const c=h.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return c[0]*0.2126+c[1]*0.7152+c[2]*0.0722;};
const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
const pairs=[];
for(const [theme,values] of Object.entries(t.semantic))for(const [foreground,background] of [['text','canvas'],['text','panel'],['text-secondary','panel'],['on-action','action'],['on-navigation','navigation'],['on-selected','selected'],['focus','panel'],['border','panel']]){
  const ratio=contrast(t.primitive[values[foreground]],t.primitive[values[background]]);
  pairs.push({theme,foreground,background,ratio:Number(ratio.toFixed(3)),minimum:foreground==='focus'||foreground==='border'?3:4.5});
}
check('Paleta exata fornecida pelo usuário',()=>assert.deepEqual(t.primitive,{primary:'#FF6A4D',foreground:'#0B0E14',background:'#FFF9F6',surface:'#FFFFFF',muted:'#E6E8EC'}));
check('Todos os pares semânticos essenciais light/dark atingem o contraste requerido',()=>{for(const p of pairs)assert(p.ratio>=p.minimum,JSON.stringify(p));});
check('Temas sem nova cor e família Inter',()=>{assert.equal(t.typography.family,'Inter');for(const values of Object.values(t.semantic))for(const key of Object.values(values))assert(key in t.primitive,key);});
const files=[];
function walk(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){const p=`${dir}/${d.name}`;if(d.isDirectory())walk(p);else if(/\.(css|tsx?|json)$/.test(d.name))files.push(p);}}
walk('packages/ui');walk('sandbox/ui-review/app');
check('CSS e componentes não introduzem hex/rgb/hsl fora dos cinco tokens',()=>{for(const file of files){const s=fs.readFileSync(file,'utf8');for(const m of s.matchAll(/#[\da-f]{6}\b/gi))assert(allowed.has(m[0].toUpperCase()),`${file}: ${m[0]}`);assert(!/\b(?:rgb|hsl)a?\(/i.test(s),file);}});
check('Sem credenciais, chamadas de API ou fontes remotas nas telas',()=>{for(const file of files){const s=fs.readFileSync(file,'utf8');assert(!/fetch\s*\(|axios\.|localStorage|sessionStorage|https:\/\//.test(s),file);assert(!/Plus Jakarta|Roboto|user-scalable=no/.test(s),file);}});
check('SVG oficial ausente é explicitamente declarado',()=>{assert.equal(t.logo.approved,false);assert.equal(t.logo.status,'official_svg_missing');assert(!fs.existsSync('branding/logo.svg'));});
check('Brandboard canônico preserva bytes da referência do ZIP',()=>{const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');assert.equal(digest('branding/brandboard.png'),digest('referencias/stitch_venda_flow_design_system/brandboard_venda_flow_ai.png/screen.png'));});
check('Motion reduzido e TypeScript strict configurados',()=>{assert(fs.readFileSync('packages/ui/styles/ui.css','utf8').includes('prefers-reduced-motion: reduce'));assert.equal(JSON.parse(fs.readFileSync('tsconfig.json','utf8')).compilerOptions.strict,true);});
const p={executedAt:new Date().toISOString(),checks:results,pairs,limits:['Auditoria estática não prova RLS, sessão, autorização ou segurança de runtime.','Nenhuma API externa integrada; nenhum segredo necessário.']};
fs.mkdirSync('docs/ui/evidencias',{recursive:true});fs.writeFileSync('docs/ui/evidencias/tokens-e-seguranca.json',JSON.stringify(p,null,2)+'\n');
for(const r of results)console.log(`${r.status}: ${r.name}${r.reason?` — ${r.reason}`:''}`);
process.exitCode=results.some(r=>r.status==='FAIL')?1:0;
