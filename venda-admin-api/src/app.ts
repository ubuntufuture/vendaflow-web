import'reflect-metadata';
import{Controller,Get,Post,Body,Req,Res,Param,Inject,Injectable,Module,SetMetadata,ValidationPipe,UseGuards,ServiceUnavailableException,BadRequestException,UnauthorizedException,Catch,type ExceptionFilter,type ArgumentsHost,type CanActivate,type ExecutionContext}from'@nestjs/common';
import{APP_GUARD,NestFactory,Reflector}from'@nestjs/core';import{json,type Response}from'express';import cookieParser from'cookie-parser';import helmet from'helmet';import fs from'node:fs';import YAML from'yaml';
import{requestMiddleware,type LogSink}from'../../venda-api/build/http.js';
import{AdminAuth,type AdminRequest}from'./auth.js';import{AdminDatabase}from'./database.js';import type{AdminConfig}from'./config.js';import{PlansService,PlanInput}from'./plans.js';
const Public=()=>SetMetadata('venda.internal.public',true);
@Injectable()
class Guard implements CanActivate{
 constructor(@Inject(AdminAuth)private readonly auth:AdminAuth,@Inject(Reflector)private readonly reflector:Reflector){}
 async canActivate(context:ExecutionContext){if(this.reflector.getAllAndOverride<boolean>('venda.internal.public',[context.getHandler(),context.getClass()]))return true;const req=context.switchToHttp().getRequest<AdminRequest>();req.actor=await this.auth.authenticate(req);if(!['GET','HEAD','OPTIONS'].includes(req.method)){if(req.path==='/v1/auth/logout')this.auth.verifyCsrf(req);else this.auth.verifyWrite(req);}return true;}
}
@Catch()
class Errors implements ExceptionFilter{
 catch(error:unknown,host:ArgumentsHost){let status=500;if(error!==null&&typeof error==='object'&&'getStatus'in error&&typeof error.getStatus==='function'){try{status=Number(error.getStatus());}catch{}}else if(error!==null&&typeof error==='object'&&'code'in error){status=['23505','23514'].includes(String(error.code))?409:String(error.code)==='42501'?403:500;}if(![400,401,403,404,409,413,415,429,500,503].includes(status))status=500;const req=host.switchToHttp().getRequest<AdminRequest>();host.switchToHttp().getResponse<Response>().status(status).json({error:{code:status===401?'UNAUTHENTICATED':status===403?'FORBIDDEN':status===409?'CONFLICT':status===503?'UNAVAILABLE':status===400?'INVALID_REQUEST':'REQUEST_FAILED',message:status===401?'Entre com a identidade interna e MFA válidos.':status===403?'Ação não permitida ou MFA precisa ser renovado.':'Não foi possível concluir a operação interna.',requestId:req.requestId}});}
}
function noQuery(req:AdminRequest){if(Object.keys(req.query).length||req.headers['x-organization-id']!==undefined||req.headers['x-tenant-id']!==undefined)throw new BadRequestException();}
@Controller()
class InternalController{
 constructor(@Inject(AdminAuth)private readonly auth:AdminAuth,@Inject(PlansService)private readonly plans:PlansService){}
 @Public()@Get('health')health(){return{status:'ok'};}
 @Public()@Get('ready')async ready(){if(!await this.auth.db.ready())throw new ServiceUnavailableException();return{status:'ok'};}
 @Public()@Get('v1/openapi.json')contract(){return YAML.parse(fs.readFileSync('contracts/admin.openapi.yaml','utf8'))as object;}
 @Public()@Get('v1/auth/login')login(@Req()req:AdminRequest,@Res()res:Response){noQuery(req);return this.auth.begin(res);}
 @Public()@Get('v1/auth/callback')callback(@Req()req:AdminRequest,@Res()res:Response){return this.auth.callback(req,res);}
 @Post('v1/auth/logout')logout(@Req()req:AdminRequest,@Res({passthrough:true})res:Response){noQuery(req);return this.auth.logout(req.actor!,res);}
 @Get('v1/me')me(@Req()req:AdminRequest){noQuery(req);const actor=req.actor!;return{user:{id:actor.id,role:actor.role},csrfToken:actor.csrf,mfaExpiresAt:new Date(actor.mfaAt.getTime()+300000).toISOString()};}
 @Get('v1/plans')list(@Req()req:AdminRequest){noQuery(req);return this.plans.list(req.actor!);}
 @Post('v1/plans')create(@Req()req:AdminRequest,@Body()body:PlanInput){noQuery(req);return this.plans.create(req.actor!,body,req.headers['idempotency-key'],req.requestId);}
 @Post('v1/plans/:id/publish')publish(@Req()req:AdminRequest,@Param('id')id:string,@Body()body:Record<string,unknown>){noQuery(req);if(!body||Object.keys(body).length)throw new BadRequestException();return this.plans.change(req.actor!,id,'published',req.headers['if-match'],req.headers['idempotency-key'],req.requestId);}
 @Post('v1/plans/:id/retire')retire(@Req()req:AdminRequest,@Param('id')id:string,@Body()body:Record<string,unknown>){noQuery(req);if(!body||Object.keys(body).length)throw new BadRequestException();return this.plans.change(req.actor!,id,'retired',req.headers['if-match'],req.headers['idempotency-key'],req.requestId);}
}
export async function createAdminApp(config:AdminConfig,sink:LogSink=line=>process.stdout.write(line+'\n')){
 const db=new AdminDatabase(config),auth=new AdminAuth(config,db),plans=new PlansService(db);
 @Module({controllers:[InternalController],providers:[{provide:AdminAuth,useValue:auth},{provide:PlansService,useValue:plans},{provide:APP_GUARD,useClass:Guard}]})class InternalModule{}
 const app=await NestFactory.create(InternalModule,{logger:false,bodyParser:false});app.use(requestMiddleware(line=>{const metadata=JSON.parse(line);sink(JSON.stringify({...metadata,service:"venda-admin-api"}));}));app.use(helmet());app.use(cookieParser());app.use(json({limit:'16kb',strict:true}));app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,forbidUnknownValues:true,transform:true,validationError:{target:false,value:false}}));app.useGlobalFilters(new Errors());app.enableCors({origin:config.webOrigin,credentials:true,methods:['GET','POST','OPTIONS'],allowedHeaders:['Content-Type','X-CSRF-Token','Idempotency-Key','If-Match']});await app.init();return{app,db,auth,close:async()=>{await app.close();await db.close();}};
}
