import type{OidcSettings}from'../../venda-api/build/oidc.js';
export interface AdminConfig extends OidcSettings{databaseUrl:string;dbTls:boolean;dbCa?:string;webOrigin:string;sessionKey:Buffer;flowKey:Buffer;csrfKey:Buffer;port:number;}
export function loadAdminConfig(env:NodeJS.ProcessEnv=process.env):AdminConfig{
 const required=(name:string)=>{if(!env[name])throw new Error('Configuração interna pendente: '+name+'. Valores omitidos.');return env[name]!;};
 const mode=required('NODE_ENV');if(!['production','development','test'].includes(mode))throw new Error('Ambiente interno inválido.');
 const localDevelopment=mode==='development'&&env.VENDA_ADMIN_LOCAL_DEVELOPMENT==='true';if(mode==='production'&&env.VENDA_ADMIN_LOCAL_DEVELOPMENT==='true')throw new Error('Desenvolvimento interno proibido em produção.');
 const parse=(value:string)=>{try{return new URL(value);}catch{throw new Error('URL interna inválida; valores omitidos.');}};
 const url=(name:string)=>{const value=required(name);const parsed=parse(value);if(parsed.username||parsed.password||parsed.hash||parsed.search||(parsed.protocol!=='https:'&&!((mode==='test'||localDevelopment)&&parsed.protocol==='http:'&&parsed.hostname==='127.0.0.1')))throw new Error('Origem interna inválida; valores omitidos.');return value;};
 const issuer=url('ADMIN_OIDC_ISSUER'),customerIssuer=url('CUSTOMER_OIDC_ISSUER');if(issuer===customerIssuer)throw new Error('Identidade interna deve ser separada da identidade cliente.');
 const webOrigin=url('ADMIN_WEB_ORIGIN');if(parse(webOrigin).pathname!=='/')throw new Error('Origem interna não pode conter caminho.');
 const databaseUrl=required('ADMIN_DATABASE_URL'),db=parse(databaseUrl);if(!['postgres:','postgresql:'].includes(db.protocol)||!db.username||!db.password||db.search||db.hash)throw new Error('Banco interno inválido.');
 const dbTls=env.ADMIN_DB_TLS==='true';if(mode==='production'&&(!dbTls||!env.ADMIN_DB_CA_PEM))throw new Error('TLS e CA obrigatórios no banco interno.');if(mode!=='production'&&!['127.0.0.1','localhost'].includes(db.hostname))throw new Error('Banco de desenvolvimento deve usar loopback.');
 const key=(name:string)=>{const value=required(name);if(!/^[a-f0-9]{64}$/i.test(value))throw new Error('Chave interna inválida.');return Buffer.from(value,'hex');};
 const sessionKey=key('ADMIN_SESSION_HASH_KEY'),flowKey=key('ADMIN_FLOW_ENCRYPTION_KEY'),csrfKey=key('ADMIN_CSRF_KEY');if(new Set([sessionKey.toString('hex'),flowKey.toString('hex'),csrfKey.toString('hex')]).size!==3)throw new Error('Chaves internas devem ser independentes.');
 const port=Number(env.PORT??3202);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Porta inválida.');
 return{nodeEnv:mode as AdminConfig['nodeEnv'],localDevelopment,issuer,apiOrigin:webOrigin,webOrigin,clientId:required('ADMIN_OIDC_CLIENT_ID'),clientSecret:required('ADMIN_OIDC_CLIENT_SECRET'),oidcTimeout:5,databaseUrl,dbTls,...(env.ADMIN_DB_CA_PEM?{dbCa:env.ADMIN_DB_CA_PEM}:{}),sessionKey,flowKey,csrfKey,port};
}
