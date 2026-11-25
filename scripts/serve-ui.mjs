import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(process.argv[2]??'sandbox/ui-review/out');
const port=Number(process.argv[3]??3100);
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain'};
export function serve(directory,serverPort){
  const base=path.resolve(directory);
  const server=http.createServer((req,res)=>{
    let url;try{url=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}catch{res.writeHead(400).end();return;}
    let target=path.resolve(base,`.${url}`);
    if(target!==base&&!target.startsWith(base+path.sep)){res.writeHead(403).end();return;}
    try{if(fs.statSync(target).isDirectory())target=path.join(target,'index.html');const body=fs.readFileSync(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]??'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"});res.end(body);}catch{res.writeHead(404).end('Não encontrado');}
  });
  return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(serverPort,'127.0.0.1',()=>resolve(server));});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){await serve(root,port);console.log(`Revisão local: http://127.0.0.1:${port}`);}
