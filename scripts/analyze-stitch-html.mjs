import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Read exports as untrusted text. Never execute their CDN or inline scripts.
const root = path.resolve('referencias/stitch_venda_flow_design_system');
const output = path.resolve('docs/ui-ativacao');
const decode = (value) => value.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const screens = [];
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  let html;
  try { html = await readFile(path.join(root, entry.name, 'code.html'), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  screens.push({
    source: `${entry.name}/code.html`, sha256: createHash('sha256').update(html).digest('hex'),
    title: decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''),
    headings: [...html.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => ({ level: m[1], text: decode(m[2]) })),
    landmarks: [...html.matchAll(/<(aside|main|header|footer|nav)\b([^>]*)>/gi)].map((m) => ({ element: m[1], attributes: m[2].trim() })),
    fields: [...html.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)].map((m) => ({ element: m[1], attributes: m[2].trim() })),
    controls: [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)].map((m) => decode(m[1])),
    externalAssets: [...new Set([...html.matchAll(/(?:src|href)="(https?:[^"\s]+)"/g)].map((m) => m[1]))],
    colors: [...new Set(html.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [])],
    layoutClasses: [...new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((c) => /^(grid|flex|fixed|sticky|w-|h-|min-|max-|.*:grid|.*:flex|.*:hidden|.*:block|.*:w-)/.test(c)))],
  });
}
await mkdir(output, { recursive: true });
await writeFile(path.join(output, 'html-inventory.json'), JSON.stringify({ sourceRoot: 'referencias/stitch_venda_flow_design_system', screens }, null, 2) + '\n');
await writeFile(path.join(output, 'HTML-REFERENCIAS.md'), `# Análise dos HTMLs do Stitch\n\nFonte primária de implementação: HTML/CSS dos exports. Imagens são conferência visual. Scripts dos exports não são executados.\n\n${screens.length} HTMLs inventariados com SHA-256, títulos, landmarks, campos, controles, cores, assets externos e classes de layout no arquivo html-inventory.json.\n\n| Export | Título | Campos | Botões |\n|---|---|---:|---:|\n${screens.map((s) => `| ${s.source} | ${s.title.replace(/\|/g, '/')} | ${s.fields.length} | ${s.controls.length} |`).join('\n')}\n\n## Regras da conversão\n\n- Preservar hierarquia, composição, painéis, navegação e responsividade dos HTMLs.\n- Inter local e os cinco tokens aprovados prevalecem sobre fontes/paletas divergentes nos exports.\n- Não carregar Tailwind CDN, scripts inline, Google Fonts, imagens remotas ou fotos de exemplo.\n- Não converter contagens, preços, clientes, status de WhatsApp, aprovação de pagamento ou mensagens de exemplo em dados reais.\n- Preservar OIDC e autorização server-side. Campos de senha do export não substituem o provedor de identidade.\n- Shell cliente e console interno têm fronteiras de identidade distintas.\n- APIs comerciais ausentes devem produzir estado indisponível dentro da estrutura da tela, sem confirmação falsa de mutação.\n`);
console.log(JSON.stringify({ htmlFiles: screens.length, output: 'docs/ui-ativacao/html-inventory.json' }));
