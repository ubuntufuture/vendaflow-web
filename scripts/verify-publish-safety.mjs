// Inspect publishable files without printing matched secrets or file contents.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const root=process.cwd();
const files=[...new Set(execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'ls-files','-co','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean))];
const findings=[];let checked=0,total=0;
const patterns=[/APP_USR-\d{10,}-\d{4,}-[a-f0-9]{24,}-\d{5,}/i,/gh[pousr]_[A-Za-z0-9]{25,}/,/github_pat_[A-Za-z0-9_]{30,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/AKIA[0-9A-Z]{16}/];
for(const file of files){
 const stat=fs.statSync(file);if(!stat.isFile())continue;checked++;total+=stat.size;
 if(/(^|\/)(?:\.local|\.runtime|node_modules|\.next)(\/|$)|(^|\/)\.env(?!\.example$)|\.har$|playwright\.zip$/i.test(file))findings.push({file,reason:'private_runtime_or_trace'});
 if(stat.size>90*1024*1024)findings.push({file,reason:'oversized_file'});
 if(!/\.(?:png|jpe?g|webp|woff2?|ico|pdf|zip)$/i.test(file)){
  const content=fs.readFileSync(file,'utf8');if(patterns.some(pattern=>pattern.test(content)))findings.push({file,reason:'credential_pattern'});
 }
}
const result={checkedAt:new Date().toISOString(),checkedFiles:checked,totalBytes:total,findings,passed:findings.length===0,scope:'Arquivos rastreados e novos não ignorados; verificação de padrões, não garantia universal de ausência de segredo'};
console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
