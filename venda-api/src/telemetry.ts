import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import type { Config } from "./config.js";
export function startTelemetry(config: Config) {
  if (!config.otlpEndpoint && !config.otlpMetricsEndpoint) return undefined;
  const sdk = new NodeSDK({
    serviceName: "venda-api",
    autoDetectResources: false,
    ...(config.otlpEndpoint
      ? {
          traceExporter: new OTLPTraceExporter({
            url: config.otlpEndpoint,
            timeoutMillis: 3000,
          }),
        }
      : { spanProcessors: [] }),
    metricReaders: config.otlpMetricsEndpoint
      ? [
          new PeriodicExportingMetricReader({
            exporter: new OTLPMetricExporter({
              url: config.otlpMetricsEndpoint,
              timeoutMillis: 3000,
            }),
            exportIntervalMillis: 30000,
            exportTimeoutMillis: 3000,
          }),
        ]
      : [],
    logRecordProcessors: [],
  });
  sdk.start();
  return sdk;
}
