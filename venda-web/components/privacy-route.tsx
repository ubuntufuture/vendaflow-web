import {api,unwrap} from '../lib/api.server';
import {PrivacyScreen} from './privacy-screen.client';
import {Fault} from './ui';
import {WebFault} from '../lib/security';
export async function PrivacyRoute({organizationId,timezone}:{organizationId:string;timezone:string}){
 try{const client=await api(),query={organizationId};const[consents,requests,contacts]=await Promise.all([client.GET('/v1/consents',{params:{query}}).then(unwrap),client.GET('/v1/privacy/requests',{params:{query}}).then(unwrap),client.GET('/v1/contacts',{params:{query:{...query,limit:100}}}).then(unwrap)]);return <PrivacyScreen organizationId={organizationId} timezone={timezone} consents={consents.data} requests={requests.data} contacts={contacts.data}/>;}catch(error){const fault=error instanceof WebFault?error:new WebFault(500);return <Fault status={fault.status} requestId={fault.requestId}/>;}
}
