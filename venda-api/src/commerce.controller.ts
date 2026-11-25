import { Controller, Get, Post, Patch, Req, Param, Body, Inject, UseGuards, ValidationPipe, BadRequestException, type Type } from '@nestjs/common';
import { TenantPolicyGuard, type ApiRequest } from './auth.js';
import { CommerceService, type Resource } from './commerce.js';
import { ContactInput, OpportunityInput, TaskInput, KnowledgeInput, WorkflowInput } from './commerce.dto.js';
import { uuid } from './policy.js';
function validateQuery(req:ApiRequest,list=false) {
  const allowed=list?['organizationId','q','limit','cursor']:['organizationId'];
  if(Object.keys(req.query).some(k=>!allowed.includes(k))) throw new BadRequestException();
  return uuid(req.query.organizationId);
}
function resourceController(resource:Resource,dto:Type<object>) {
  const bodyPipe=(patch=false)=>new ValidationPipe({expectedType:dto,whitelist:true,forbidNonWhitelisted:true,forbidUnknownValues:true,transform:true,skipUndefinedProperties:patch,validationError:{target:false,value:false}});
  @UseGuards(TenantPolicyGuard)
  @Controller(`/v1/${resource}`)
  class ResourceController {
    constructor(@Inject(CommerceService) private readonly service:CommerceService) {}
    @Get() list(@Req() req:ApiRequest) {return this.service.list(req.actor!,validateQuery(req,true),resource,req.query);}
    @Get(':id') get(@Req() req:ApiRequest,@Param('id') id:string) {return this.service.get(req.actor!,validateQuery(req),resource,id);}
    @Post() create(@Req() req:ApiRequest,@Body(bodyPipe()) body:Record<string,unknown>) {return this.service.create(req.actor!,validateQuery(req),resource,body,req.headers['idempotency-key'],req.requestId);}
    @Patch(':id') update(@Req() req:ApiRequest,@Param('id') id:string,@Body(bodyPipe(true)) body:Record<string,unknown>) {return this.service.update(req.actor!,validateQuery(req),resource,id,body,req.headers['idempotency-key'],req.headers['if-match'],req.requestId);}
    @Post(':id/archive') archive(@Req() req:ApiRequest,@Param('id') id:string,@Body() body:unknown) {if(body!==undefined && Object.keys(body as object).length) throw new BadRequestException(); return this.service.update(req.actor!,validateQuery(req),resource,id,{},req.headers['idempotency-key'],req.headers['if-match'],req.requestId,true);}
  }
  return ResourceController;
}
@UseGuards(TenantPolicyGuard)
@Controller('/v1/reports')
class ReportsController {
  constructor(@Inject(CommerceService) private readonly service:CommerceService) {}
  @Get('overview') overview(@Req() req:ApiRequest) {return this.service.overview(req.actor!,validateQuery(req));}
}
@UseGuards(TenantPolicyGuard)
@Controller('/v1/workflows')
class WorkflowOperationsController {
  constructor(@Inject(CommerceService) private readonly service:CommerceService) {}
  @Post(':id/activate') activate(@Req() req:ApiRequest,@Param('id') id:string,@Body() body:unknown) {return this.change(req,id,'active',body);}
  @Post(':id/pause') pause(@Req() req:ApiRequest,@Param('id') id:string,@Body() body:unknown) {return this.change(req,id,'paused',body);}
  @Get(':id/executions') executions(@Req() req:ApiRequest,@Param('id') id:string) {return this.service.executions(req.actor!,validateQuery(req),id);}
  private change(req:ApiRequest,id:string,state:'active'|'paused',body:unknown) {
    if(body!==undefined&&Object.keys(body as object).length) throw new BadRequestException();
    return this.service.workflowState(req.actor!,validateQuery(req),id,state,req.headers['idempotency-key'],req.headers['if-match'],req.requestId);
  }
}
export const commerceControllers = [resourceController('contacts',ContactInput),resourceController('opportunities',OpportunityInput),resourceController('tasks',TaskInput),resourceController('knowledge',KnowledgeInput),resourceController('workflows',WorkflowInput),ReportsController,WorkflowOperationsController];
