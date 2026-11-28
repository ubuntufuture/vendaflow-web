import {Controller,Get,Post,Req,Body,Param,Inject,UseGuards,BadRequestException,HttpCode} from '@nestjs/common';
import {TenantPolicyGuard,type ApiRequest} from '../auth.js';
import {uuid} from '../policy.js';
import {BillingService,CheckoutInput} from './billing.js';
function organization(req:ApiRequest){if(Object.keys(req.query).some(key=>key!=='organizationId'))throw new BadRequestException();return uuid(req.query.organizationId);}
function empty(body:unknown){if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).length)throw new BadRequestException();}
@UseGuards(TenantPolicyGuard)
@Controller('/v1/billing')
export class BillingController {
 constructor(@Inject(BillingService)private readonly service:BillingService){}
 @Get('plans')plans(@Req()req:ApiRequest){return this.service.plans(req.actor!,organization(req));}
 @Get('status')status(@Req()req:ApiRequest){return this.service.status(req.actor!,organization(req));}
 @Post('checkout')@HttpCode(202)checkout(@Req()req:ApiRequest,@Body()body:CheckoutInput){return this.service.checkout(req.actor!,organization(req),body,req.headers['idempotency-key'],req.requestId);}
 @Post('subscriptions/:id/cancel')@HttpCode(202)cancel(@Req()req:ApiRequest,@Param('id')id:string,@Body()body:Record<string,unknown>){empty(body);return this.service.command(req.actor!,organization(req),id,'cancel',req.headers['idempotency-key'],req.requestId);}
 @Post('subscriptions/:id/reconcile')@HttpCode(202)reconcile(@Req()req:ApiRequest,@Param('id')id:string,@Body()body:Record<string,unknown>){empty(body);return this.service.command(req.actor!,organization(req),id,'reconcile',req.headers['idempotency-key'],req.requestId);}
}
