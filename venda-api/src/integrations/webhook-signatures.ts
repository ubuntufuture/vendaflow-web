import {createHmac,timingSafeEqual} from 'node:crypto';
const equalHex=(expected:string,actual:string)=>/^[a-f0-9]{64}$/i.test(actual)&&timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(actual,'hex'));
/** Verify the exact bytes, before parsing or transforming a Meta webhook body. */
export function verifyMetaWebhook(raw:Buffer,signature:unknown,appSecret:string):boolean{
 if(!appSecret||typeof signature!=='string'||!/^sha256=[a-f0-9]{64}$/i.test(signature)||raw.length>262144)return false;
 return equalHex(createHmac('sha256',appSecret).update(raw).digest('hex'),signature.slice(7));
}
/** Only the signed resource ID is trusted; fetch its current state from Mercado Pago. */
export function verifyMercadoPagoWebhook(input:{dataId:unknown;requestId:unknown;signature:unknown},secret:string,now=Date.now()):{resourceId:string;timestamp:number}|null{
 if(!secret||typeof input.dataId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(input.dataId)||typeof input.requestId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(input.requestId)||typeof input.signature!=='string')return null;
 const parts=input.signature.split(',').map(part=>part.trim().split('='));
 if(parts.length!==2||parts.some(pair=>pair.length!==2)||new Set(parts.map(p=>p[0])).size!==2)return null;
 const values=Object.fromEntries(parts);if(!/^\d{10,13}$/.test(values.ts??'')||!values.v1)return null;
 const stamp=Number(values.ts),milliseconds=stamp<1e12?stamp*1000:stamp;
 if(!Number.isSafeInteger(stamp)||Math.abs(now-milliseconds)>300000)return null;
 const resourceId=input.dataId.toLowerCase();const manifest=`id:${resourceId};request-id:${input.requestId};ts:${values.ts};`;
 return equalHex(createHmac('sha256',secret).update(manifest).digest('hex'),values.v1)?{resourceId,timestamp:milliseconds}:null;
}
