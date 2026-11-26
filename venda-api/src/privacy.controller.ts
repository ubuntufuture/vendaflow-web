import {Controller,Get,Post,Req,Body,Param,Inject,UseGuards,BadRequestException} from '@nestjs/common';
import {TenantPolicyGuard,type ApiRequest} from './auth.js';
import {PrivacyService,ConsentInput,PrivacyRequestInput} from './privacy.js';
import {uuid} from './policy.js';
function organization(req:ApiRequest){if(Object.keys(req.query).some(key=>key!=='organizationId'))throw new BadRequestException();return uuid(req.query.organizationId);}
@UseGuards(TenantPolicyGuard)
@Controller('/v1')
export class PrivacyController {
 constructor(@Inject(PrivacyService)private readonly service:PrivacyService){}
 @Get('consents')consents(@Req()req:ApiRequest){return this.service.list(req.actor!,organization(req),'consent');}
 @Post('consents')consent(@Req()req:ApiRequest,@Body()body:ConsentInput){return this.service.createConsent(req.actor!,organization(req),body,req.headers['idempotency-key'],req.requestId);}
 @Get('privacy/requests')requests(@Req()req:ApiRequest){return this.service.list(req.actor!,organization(req),'request');}
 @Post('privacy/requests')request(@Req()req:ApiRequest,@Body()body:PrivacyRequestInput){return this.service.createRequest(req.actor!,organization(req),body,req.headers['idempotency-key'],req.requestId);}
 @Get('privacy/requests/:id/export')export(@Req()req:ApiRequest,@Param('id')id:string){return this.service.exportRequest(req.actor!,organization(req),id,req.requestId);}
}
