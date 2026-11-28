import {api,unwrap} from '../lib/api.server';
import {WebFault} from '../lib/security';
import {Fault} from './ui';
import {BillingScreen} from './billing-screen.client';
export async function BillingRoute({organizationId}:{organizationId:string}){
 try{const client=await api(),query={organizationId};const[plans,status]=await Promise.all([client.GET('/v1/billing/plans',{params:{query}}).then(unwrap),client.GET('/v1/billing/status',{params:{query}}).then(unwrap)]);return <BillingScreen organizationId={organizationId} plans={plans.data} status={status}/>;}
 catch(error){const fault=error instanceof WebFault?error:new WebFault(500);return <Fault status={fault.status} requestId={fault.requestId}/>;}
}
