import fs from 'node:fs';
const t=JSON.parse(fs.readFileSync('branding/tokens.json','utf8'));
let css='/* Gerado por npm run tokens. Edite branding/tokens.json. */\n';
css+=':root {\n';
for(const [key,val] of Object.entries(t.primitive))css+=`  --vf-brand-${key}: ${val};\n`;
css+='  --vf-font: "Inter Variable", "Inter", sans-serif;\n';
for(const [key,val] of Object.entries(t.spacing))css+=`  --vf-space-${key}: ${val};\n`;
for(const [key,val] of Object.entries(t.radius))css+=`  --vf-radius-${key}: ${val};\n`;
for(const [key,val] of Object.entries(t.elevation))css+=`  --vf-elevation-${key}: ${val};\n`;
for(const [key,val] of Object.entries(t.motion))css+=`  --vf-motion-${key}: ${val};\n`;
for(const [key,val] of Object.entries(t.typography.scale))css+=`  --vf-type-${key}: ${val.size};\n  --vf-line-${key}: ${val.lineHeight};\n`;
css+='}\n';
for(const [theme,values] of Object.entries(t.semantic)){
  css+=`${theme==='light'?':root, ':''}[data-theme="${theme}"] {\n  color-scheme: ${theme};\n`;
  for(const [key,val] of Object.entries(values))css+=`  --vf-${key}: var(--vf-brand-${val});\n`;
  css+='}\n';
}
css+='@media (prefers-reduced-motion: reduce) { :root { --vf-motion-fast: 0ms; --vf-motion-normal: 0ms; } }\n';
fs.mkdirSync('packages/ui/styles',{recursive:true});
fs.writeFileSync('packages/ui/styles/tokens.css',css);
console.log('Tokens light/dark gerados sem novas cores.');
