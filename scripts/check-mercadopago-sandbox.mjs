// Credentials are read only from private runtime storage; no browser or worker import.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const location=JSON.parse(fs.readFileSync(path.join(root,'.local/runtime-location.json'),'utf8'));
const keys=JSON.parse(fs.readFileSync(path.join(location.directory,'secrets.json'),'utf8'));
const {MercadoPagoSandboxReadClient,sandboxCredentials,BillingProviderError}=await import(pathToFileURL(path.join(root,'venda-api/build/billing/mercado-pago.js')).href);
let result;
try {
 const client=new MercadoPagoSandboxReadClient(sandboxCredentials(keys.mercadoPagoSandbox));
 result={checkedAt:new Date().toISOString(),provider:'Mercado Pago',...await client.inspectConnection(),credentialValuesRecorded:false,chargesCreated:0,subscriptionsCreated:0,subscriptionCreationValidated:false};
} catch(error) {
 result={checkedAt:new Date().toISOString(),provider:'Mercado Pago',accountAuthenticated:false,category:error instanceof BillingProviderError?error.category:'configuration',httpStatus:error instanceof BillingProviderError?error.status:null,credentialValuesRecorded:false,chargesCreated:0,subscriptionsCreated:0,subscriptionCreationValidated:false};
 process.exitCode=1;
}
const destination=path.join(root,'docs/operacao-real/evidencias/mercadopago-conexao.json');
fs.writeFileSync(destination,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
