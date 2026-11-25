import fs from 'node:fs';
import YAML from 'yaml';
import {preservesFoundation} from './backward-compat.mjs';
const base = YAML.parse(fs.readFileSync('contracts/foundation.openapi.yaml','utf8'));
const security = base.paths['/v1/me'].get.security;
const str = (maxLength=120) => ({type:'string',minLength:1,maxLength});
const nullable = s => ({...s,nullable:true});
const id = {type:'string',format:'uuid'};
const fields = {
  contacts: {name:str(),phone:nullable({type:'string',pattern:'^\\+[1-9][0-9]{7,14}$'}),email:nullable({type:'string',format:'email',maxLength:254})},
  opportunities: {title:str(160),contactId:nullable(id),stage:{type:'string',enum:['new','conversation','proposal','won','lost']},amountCents:nullable({type:'integer',minimum:0,maximum:9000000000000})},
  tasks: {title:str(160),contactId:nullable(id),opportunityId:nullable(id),dueAt:nullable({type:'string',format:'date-time'}),completed:{type:'boolean'}},
  knowledge: {title:str(160),content:str(12000)},
  workflows: {name:str(),trigger:{type:'string',enum:['opportunity.won','task.created']},taskTitle:str(160)},
};
const required = {contacts:['name'],opportunities:['title','stage'],tasks:['title'],knowledge:['title','content'],workflows:['name','trigger','taskTitle']};
const names = {contacts:'Contact',opportunities:'Opportunity',tasks:'Task',knowledge:'KnowledgeEntry',workflows:'Workflow'};
const org = {name:'organizationId',in:'query',required:true,schema:id};
const requestHeaders = [{name:'X-CSRF-Token',in:'header',required:true,schema:{type:'string'}},{name:'Idempotency-Key',in:'header',required:true,schema:{type:'string',minLength:16,maxLength:128,pattern:'^[A-Za-z0-9_-]+$'}}];
const response = schema => ({description:'Dados confirmados no banco da organização',content:{'application/json':{schema}}});
const errors = Object.fromEntries([400,401,403,404,409,413,429,500,503,504].map(code=>[code,{description:'Erro uniforme',content:{'application/json':{schema:{$ref:'#/components/schemas/Error'}}}}]));
const commercial = {openapi:'3.0.3', info:{title:'Venda Flow AI — operações comerciais',version:'0.2.0',description:'Extensão candidata baseada nos fluxos recebidos. Sem dados seed, gateway ou evidência fictícia. Compatibilidade com OpenAPI canônico pendente: arquivo não fornecido.'},security,paths:{},components:{schemas:{},securitySchemes:base.components.securitySchemes}};
for (const [resource,properties] of Object.entries(fields)) {
  const name = names[resource], ref={$ref:`#/components/schemas/${name}`};
  commercial.components.schemas[`${name}Input`]={type:'object',additionalProperties:false,required:required[resource],properties};
  commercial.components.schemas[`${name}Patch`]={type:'object',additionalProperties:false,minProperties:1,properties};
  commercial.components.schemas[name]={type:'object',additionalProperties:false,required:['id','organizationId','createdAt','updatedAt','version','archived',...required[resource]],properties:{id,organizationId:id,...properties,createdAt:{type:'string',format:'date-time'},updatedAt:{type:'string',format:'date-time'},version:{type:'integer',minimum:1},archived:{type:'boolean'},...(resource==='opportunities'?{currency:{type:'string',enum:['BRL']}}:{}),...(resource==='workflows'?{status:{type:'string',enum:['draft']}}:{})}};
  const list={type:'object',required:['data','nextCursor'],properties:{data:{type:'array',items:ref},nextCursor:nullable(id)}};
  const common={security,parameters:[org]};
  const listParams=[org,{name:'q',in:'query',schema:{type:'string',maxLength:120}},{name:'cursor',in:'query',schema:id},{name:'limit',in:'query',schema:{type:'integer',minimum:1,maximum:100,default:50}}];
  commercial.paths[`/v1/${resource}`]={
    get:{...common,operationId:`list${name}`,parameters:listParams,responses:{200:response(list),...errors}},
    post:{...common,operationId:`create${name}`,parameters:[org,...requestHeaders],requestBody:{required:true,content:{'application/json':{schema:{$ref:`#/components/schemas/${name}Input`}}}},responses:{201:response(ref),...errors}}
  };
  const pathParams=[org,{name:'id',in:'path',required:true,schema:id}];
  commercial.paths[`/v1/${resource}/{id}`]={
    get:{...common,operationId:`get${name}`,parameters:pathParams,responses:{200:response(ref),...errors}},
    patch:{...common,operationId:`update${name}`,parameters:[...pathParams,...requestHeaders,{name:'If-Match',in:'header',required:true,description:'Versão numérica atual; conflito retorna 409.',schema:{type:'string',pattern:'^[1-9][0-9]*$'}}],requestBody:{required:true,content:{'application/json':{schema:{$ref:`#/components/schemas/${name}Patch`}}}},responses:{200:response(ref),...errors}},
  };
  commercial.paths[`/v1/${resource}/{id}/archive`]={post:{...common,operationId:`archive${name}`,parameters:[...pathParams,...requestHeaders,{name:'If-Match',in:'header',required:true,schema:{type:'string',pattern:'^[1-9][0-9]*$'}}],requestBody:{required:false,content:{'application/json':{schema:{type:'object',additionalProperties:false}}}},responses:{201:response(ref),...errors}}};
}
commercial.components.schemas.CommercialOverview={type:'object',required:['contacts','openOpportunities','pendingTasks','proposalAmountCents','currency','confirmedRevenueCents'],properties:{contacts:{type:'integer',minimum:0},openOpportunities:{type:'integer',minimum:0},pendingTasks:{type:'integer',minimum:0},proposalAmountCents:{type:'integer',minimum:0},currency:{type:'string',enum:['BRL']},confirmedRevenueCents:{type:'integer',nullable:true,description:'null: não há fonte financeira confirmada. Propostas e oportunidades ganhas não são receita.'}}};
commercial.paths['/v1/reports/overview']={get:{operationId:'commercialOverview',parameters:[org],security,responses:{200:response({$ref:'#/components/schemas/CommercialOverview'}),...errors}}};
commercial.components.schemas.Error=base.components.schemas.Error;
commercial.components.schemas.Workflow.properties.status.enum=['draft','active','paused'];
for(const operation of ['activate','pause']) commercial.paths[`/v1/workflows/{id}/${operation}`]={post:{operationId:`${operation}Workflow`,security,parameters:[org,{name:'id',in:'path',required:true,schema:id},...requestHeaders,{name:'If-Match',in:'header',required:true,schema:{type:'string',pattern:'^[1-9][0-9]*$'}}],requestBody:{required:false,content:{'application/json':{schema:{type:'object',additionalProperties:false}}}},responses:{201:response({$ref:'#/components/schemas/Workflow'}),...errors}}};
commercial.paths['/v1/workflows/{id}/executions']={get:{operationId:'workflowExecutions',security,parameters:[org,{name:'id',in:'path',required:true,schema:id}],responses:{200:response({type:'object',required:['data'],properties:{data:{type:'array',items:{type:'object',required:['id','taskId','createdAt'],properties:{id,taskId:id,createdAt:{type:'string',format:'date-time'}}}}}}),...errors}}};
const combined={...base,info:{...commercial.info,title:'Venda Flow AI — API'},paths:{...structuredClone(base.paths),...commercial.paths},components:{...base.components,schemas:{...base.components.schemas,...commercial.components.schemas}}};
for(const name of ['iss','session_state','error','error_description'])combined.paths['/v1/auth/callback'].get.parameters.push({name,in:'query',required:false,schema:{type:'string',maxLength:2048}});
if(!preservesFoundation(base,combined))throw new Error('Regressão de contrato da fundação');
fs.writeFileSync('contracts/commercial.openapi.yaml',YAML.stringify(commercial));
fs.writeFileSync('contracts/venda.openapi.yaml',YAML.stringify(combined));
console.log(`Contrato primeiro: ${Object.keys(combined.paths).length} paths; fundação preservada.`);
