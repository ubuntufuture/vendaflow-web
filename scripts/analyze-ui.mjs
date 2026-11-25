import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
const result=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build','sandbox/ui-review','--webpack'],{stdio:'inherit',env:{...process.env,ANALYZE:'true',NEXT_TELEMETRY_DISABLED:'1'}});
if(result.status!==0)process.exit(result.status??1);
fs.mkdirSync('docs/ui/evidencias/bundle-analyzer',{recursive:true});
for(const file of fs.readdirSync('sandbox/ui-review/.next/analyze'))if(file.endsWith('.html'))fs.copyFileSync(`sandbox/ui-review/.next/analyze/${file}`,`docs/ui/evidencias/bundle-analyzer/${file}`);
