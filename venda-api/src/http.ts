import {
  Catch,
  HttpException,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  metrics,
  trace,
  SpanKind,
  SpanStatusCode,
  context,
} from "@opentelemetry/api";
import type { Request, Response, NextFunction } from "express";
import type { ApiRequest } from "./auth.js";
export type LogSink = (line: string) => void;
export function safeLog(
  sink: LogSink,
  event: {
    requestId: string;
    method: string;
    route: string;
    status: number;
    durationMs: number;
  },
) {
  sink(
    JSON.stringify({
      service: "venda-api",
      requestId: event.requestId,
      method: event.method,
      route: event.route,
      status: event.status,
      durationMs: Number(event.durationMs.toFixed(3)),
    }),
  );
}
export function requestMiddleware(sink: LogSink) {
  const histogram = metrics
    .getMeter("venda-api")
    .createHistogram("http.server.request.duration", { unit: "ms" });
  return (req: Request, res: Response, next: NextFunction) => {
    const request = req as ApiRequest;
    request.requestId = randomUUID();
    res.setHeader("X-Request-Id", request.requestId);
    res.setHeader("Cache-Control", "no-store");
    const start = performance.now();
    const span = trace
      .getTracer("venda-api")
      .startSpan("HTTP request", { kind: SpanKind.SERVER });
    res.on("finish", () => {
      const route =
        typeof req.route?.path === "string" ? req.route.path : "unmatched";
      const durationMs = performance.now() - start;
      span.updateName(`${req.method} ${route}`);
      span.setAttributes({
        "http.request.method": req.method,
        "http.route": route,
        "http.response.status_code": res.statusCode,
      });
      if (res.statusCode >= 500) span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
      histogram.record(durationMs, {
        "http.route": route,
        "http.request.method": req.method,
        "http.response.status_code": res.statusCode,
      });
      safeLog(sink, {
        requestId: request.requestId,
        method: req.method,
        route,
        status: res.statusCode,
        durationMs,
      });
    });
    context.with(trace.setSpan(context.active(), span), next);
  };
}
export function errorBody(error: unknown, requestId: string) {
  const dbCode =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";
  const parserStatus =
    typeof error === "object" && error !== null && "status" in error
      ? Number(error.status)
      : undefined;
  let status =
    error instanceof HttpException
      ? error.getStatus()
      : dbCode === "23505" || dbCode === "23514"
        ? 409
        : dbCode === "23503"
          ? 404
          : dbCode === "42501"
            ? 403
            : dbCode === "22023"
              ? 400
              : [
                    "53300",
                    "57014",
                    "55P03",
                    "ECONNREFUSED",
                    "DATABASE_BUSY",
                  ].includes(dbCode)
                ? 503
                : parserStatus === 413
                  ? 413
                  : parserStatus === 400
                    ? 400
                    : 500;
  if (![400, 401, 403, 404, 409, 413, 415, 429, 500, 503].includes(status))
    status = 500;
  const codes: Record<number, [string, string]> = {
    400: ["INVALID_REQUEST", "Revise os dados da solicitação."],
    401: ["UNAUTHENTICATED", "Entre com uma sessão válida."],
    403: ["FORBIDDEN", "Seu acesso não permite esta ação."],
    404: ["NOT_FOUND", "Recurso indisponível."],
    409: ["CONFLICT", "A operação conflita com o estado atual."],
    413: ["PAYLOAD_TOO_LARGE", "A solicitação excede o limite permitido."],
    415: ["UNSUPPORTED_MEDIA_TYPE", "Utilize conteúdo JSON."],
    429: ["RATE_LIMITED", "Aguarde antes de tentar novamente."],
    500: ["INTERNAL_ERROR", "Não foi possível concluir a operação."],
    503: ["UNAVAILABLE", "Serviço temporariamente indisponível."],
  };
  const [code, message] = codes[status]!;
  return { status, body: { error: { code, message, requestId } } };
}
@Catch()
export class Errors implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const req = host.switchToHttp().getRequest<ApiRequest>();
    const res = host.switchToHttp().getResponse<Response>();
    const result = errorBody(exception, req.requestId);
    res.status(result.status).json(result.body);
  }
}
