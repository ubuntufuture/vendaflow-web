import "reflect-metadata";
import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Req,
  Res,
  Inject,
  Module,
  UseGuards,
  ValidationPipe,
  ServiceUnavailableException,
  BadRequestException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import { APP_GUARD, NestFactory } from "@nestjs/core";
import { json, type Response } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import fs from "node:fs";
import YAML from "yaml";
import type { Config } from "./config.js";
import { Database } from "./database.js";
import {
  AuthService,
  OidcClient,
  Policy,
  Public,
  SessionGuard,
  TenantPolicyGuard,
  type ApiRequest,
} from "./auth.js";
import { FoundationService } from "./foundation.js";
import { CommerceService } from "./commerce.js";
import { commerceControllers } from "./commerce.controller.js";
import {PrivacyController} from './privacy.controller.js';
import {PrivacyService} from './privacy.js';
import {
  CreateMembershipDto,
  CreateOrganizationDto,
  UpdateMembershipDto,
  UpdateOrganizationDto,
} from "./dto.js";
import { Errors, errorBody, requestMiddleware, type LogSink } from "./http.js";
import { uuid } from "./policy.js";
function query(req: ApiRequest, allowed: string[] = []) {
  if (Object.keys(req.query).some((k) => !allowed.includes(k)))
    throw new BadRequestException();
}
function unscoped(req: ApiRequest) {
  if (
    req.headers["x-organization-id"] !== undefined ||
    req.headers["x-tenant-id"] !== undefined
  )
    throw new BadRequestException();
}
@Controller()
class FoundationController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(FoundationService) private readonly service: FoundationService,
  ) {}
  @Public() @Get("/health") health() {
    return { status: "ok" };
  }
  @Public() @Get("/ready") async ready() {
    if (!(await this.auth.db.ready())) throw new ServiceUnavailableException();
    return { status: "ok" };
  }
  @Public() @Get("/v1/openapi.json") contract() {
    return YAML.parse(
      fs.readFileSync("contracts/venda.openapi.yaml", "utf8"),
    ) as object;
  }
  @Public() @Get('/v1/plans') plans(@Req() req: ApiRequest) {
    query(req); unscoped(req);
    return this.auth.db.tx({}, async client => ({data: (await client.query(
      "SELECT id,code,version,name,amount_cents,currency,frequency,frequency_type,features,limits FROM venda_admin.plan_versions WHERE status='published' ORDER BY code LIMIT 200",
    )).rows.map(row => ({id:row.id,code:row.code,version:row.version,name:row.name,amountCents:Number(row.amount_cents),currency:row.currency,frequency:row.frequency,frequencyType:row.frequency_type,features:row.features,limits:row.limits}))}));
  }
  @Public() @Get("/v1/auth/login") login(
    @Req() req: ApiRequest,
    @Res() res: Response,
  ) {
    query(req);
    return this.auth.begin(res);
  }
  @Public() @Get("/v1/auth/callback") callback(
    @Req() req: ApiRequest,
    @Res() res: Response,
  ) {
    return this.auth.callback(req, res);
  }
  @Post("/v1/auth/logout") logout(
    @Req() req: ApiRequest,
    @Res() res: Response,
  ) {
    query(req);
    return this.auth.logout(req, res);
  }
  @Get("/v1/me") me(@Req() req: ApiRequest) {
    query(req);
    unscoped(req);
    const actor = req.actor!;
    return {
      user: { id: actor.userId },
      csrfToken: actor.csrfToken,
      sessionExpiresAt: actor.expiresAt.toISOString(),
    };
  }
  @Get("/v1/organizations") organizations(@Req() req: ApiRequest) {
    query(req);
    unscoped(req);
    return this.service.organizations(req.actor!);
  }
  @Post("/v1/organizations") createOrganization(
    @Req() req: ApiRequest,
    @Body() body: CreateOrganizationDto,
  ) {
    query(req);
    unscoped(req);
    return this.service.createOrganization(
      req.actor!,
      body,
      req.headers["idempotency-key"],
      req.requestId,
    );
  }
  @UseGuards(TenantPolicyGuard)
  @Get("/v1/organizations/:organizationId")
  organization(@Req() req: ApiRequest, @Param("organizationId") id: string) {
    query(req);
    return this.service.getOrganization(req.actor!, id);
  }
  @UseGuards(TenantPolicyGuard)
  @Policy("organization.update")
  @Patch("/v1/organizations/:organizationId")
  updateOrganization(
    @Req() req: ApiRequest,
    @Param("organizationId") id: string,
    @Body() body: UpdateOrganizationDto,
  ) {
    query(req);
    return this.service.updateOrganization(
      req.actor!,
      id,
      body,
      req.headers["idempotency-key"],
      req.requestId,
    );
  }
  @UseGuards(TenantPolicyGuard) @Get("/v1/memberships") memberships(
    @Req() req: ApiRequest,
  ) {
    query(req, ["organizationId"]);
    return this.service.memberships(req.actor!, uuid(req.query.organizationId));
  }
  @UseGuards(TenantPolicyGuard)
  @Policy("membership.manage")
  @Post("/v1/organizations/:organizationId/memberships")
  createMembership(
    @Req() req: ApiRequest,
    @Param("organizationId") id: string,
    @Body() body: CreateMembershipDto,
  ) {
    query(req);
    return this.service.createMembership(
      req.actor!,
      id,
      body,
      req.headers["idempotency-key"],
      req.requestId,
    );
  }
  @UseGuards(TenantPolicyGuard)
  @Policy("membership.manage")
  @Patch("/v1/organizations/:organizationId/memberships/:membershipId")
  updateMembership(
    @Req() req: ApiRequest,
    @Param("organizationId") id: string,
    @Param("membershipId") memberId: string,
    @Body() body: UpdateMembershipDto,
  ) {
    query(req);
    return this.service.updateMembership(
      req.actor!,
      id,
      memberId,
      body,
      req.headers["idempotency-key"],
      req.requestId,
    );
  }
}
export async function createApp(
  config: Config,
  db: Database = new Database(config),
  sink: LogSink = (line) => process.stdout.write(line + "\n"),
) {
  const auth = new AuthService(config, db, new OidcClient(config));
  const service = new FoundationService(auth);
  @Module({
    controllers: [FoundationController,...commerceControllers,PrivacyController],
    providers: [
      { provide: AuthService, useValue: auth },
      { provide: FoundationService, useValue: service },
      { provide: CommerceService, useValue: new CommerceService(auth) },
      { provide: PrivacyService, useValue: new PrivacyService(auth) },
      TenantPolicyGuard,
      { provide: APP_GUARD, useClass: SessionGuard },
    ],
  })
  class AppModule {}
  const app = await NestFactory.create(AppModule, {
    logger: false,
    bodyParser: false,
  });
  app.use(requestMiddleware(sink));
  app.use(helmet());
  app.use(cookieParser());
  app.use(json({ limit: "16kb", strict: true }));
  app.use(
    (req: ApiRequest, _res: Response, next: (error?: unknown) => void) => {
      if (
        ["POST", "PATCH"].includes(req.method) &&
        req.path !== "/v1/auth/logout" &&
        !req.is("application/json")
      )
        return next(new UnsupportedMediaTypeException());
      if (Array.isArray(req.body) || req.body === null)
        return next(new BadRequestException());
      next();
    },
  );
  app.enableCors({
    origin: config.appOrigin,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "X-CSRF-Token",
      "X-Organization-Id",
      "Idempotency-Key",
      "If-Match",
    ],
    maxAge: 600,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      validationError: { target: false, value: false },
    }),
  );
  app.useGlobalFilters(new Errors(sink));
  await app.init();
  return {
    app,
    db,
    auth,
    async close() {
      await app.close();
      await db.close();
    },
  };
}
