import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { gzipSync } from "node:zlib";
import { createServer } from "node:http";
import lighthouse from "lighthouse";
import desktop from "lighthouse/core/config/desktop-config.js";
import { launch } from "chrome-launcher";
const output = "docs/frontend/evidencias";
fs.mkdirSync(`${output}/lighthouse`, { recursive: true });
process.env.NODE_ENV = "production";
const { default: next } = await import("next");
const app = next({
  dev: false,
  dir: path.resolve("venda-web"),
  hostname: "127.0.0.1",
  port: 3401,
});
await app.prepare();
const server = createServer(app.getRequestHandler());
await new Promise((resolve) => server.listen(3401, "127.0.0.1", resolve));
const runs = [];
let chrome;
try {
  chrome = await launch({
    chromePath:
      process.env.UI_CHROME_PATH ??
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    chromeFlags: ["--headless", "--disable-gpu", "--no-first-run"],
  });
  for (const profile of [
    { name: "desktop", config: desktop },
    {
      name: "mobile-rede-restrita",
      config: {
        extends: "lighthouse:default",
        settings: {
          formFactor: "mobile",
          screenEmulation: {
            mobile: true,
            width: 390,
            height: 844,
            deviceScaleFactor: 1,
            disabled: false,
          },
          throttlingMethod: "simulate",
          throttling: {
            rttMs: 150,
            throughputKbps: 1600,
            cpuSlowdownMultiplier: 4,
            requestLatencyMs: 150,
            downloadThroughputKbps: 1600,
            uploadThroughputKbps: 750,
          },
        },
      },
    },
  ])
    for (const route of ["/", "/entrar"])
      for (let iteration = 1; iteration <= 3; iteration++) {
        const result = await lighthouse(
          `http://127.0.0.1:3401${route}`,
          {
            port: chrome.port,
            logLevel: "error",
            onlyCategories: ["performance"],
            output: "json",
          },
          profile.config,
        );
        if (!result || result.lhr.runtimeError)
          throw new Error("Lighthouse não concluiu; consulte a execução.");
        const lhr = result.lhr;
        fs.writeFileSync(
          `${output}/lighthouse/${profile.name}-${route === "/" ? "home" : "entrar"}-${iteration}.json.gz`,
          gzipSync(JSON.stringify(lhr)),
        );
        const requests = lhr.audits["network-requests"].details?.items ?? [];
        runs.push({
          route,
          profile: profile.name,
          iteration,
          score: lhr.categories.performance.score,
          fcp: lhr.audits["first-contentful-paint"].numericValue,
          lcp: lhr.audits["largest-contentful-paint"].numericValue,
          cls: lhr.audits["cumulative-layout-shift"].numericValue,
          tbt: lhr.audits["total-blocking-time"].numericValue,
          jsTransferBytes: requests
            .filter((r) => r.resourceType === "Script")
            .reduce((sum, r) => sum + r.transferSize, 0),
          settings: lhr.configSettings,
          environment: lhr.environment,
          warnings: lhr.runWarnings,
        });
        console.log(
          `${profile.name} ${route} ${iteration}/3: FCP ${runs.at(-1).fcp.toFixed(0)}ms; LCP ${runs.at(-1).lcp.toFixed(0)}ms`,
        );
      }
} finally {
  if (chrome) await chrome.kill();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await app.close();
}
const q = (values, p) =>
  [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1];
const summaries = [...new Set(runs.map((r) => `${r.profile}|${r.route}`))].map(
  (key) => {
    const own = runs.filter((r) => `${r.profile}|${r.route}` === key);
    return {
      profile: own[0].profile,
      route: own[0].route,
      samples: own.length,
      fcpP75: q(
        own.map((r) => r.fcp),
        0.75,
      ),
      fcpP95: q(
        own.map((r) => r.fcp),
        0.95,
      ),
      lcpP75: q(
        own.map((r) => r.lcp),
        0.75,
      ),
      lcpP95: q(
        own.map((r) => r.lcp),
        0.95,
      ),
      clsP75: q(
        own.map((r) => r.cls),
        0.75,
      ),
      tbtP75: q(
        own.map((r) => r.tbt),
        0.75,
      ),
      jsTransferP75: q(
        own.map((r) => r.jsTransferBytes),
        0.75,
      ),
    };
  },
);
fs.writeFileSync(
  `${output}/lighthouse.json`,
  JSON.stringify(
    {
      executedAt: new Date().toISOString(),
      host: {
        node: process.version,
        cpu: os.cpus()[0]?.model,
        memoryBytes: os.totalmem(),
      },
      conditions:
        "Build Next de produção, origem loopback Windows; cache/storage limpos por Lighthouse; presets e versões registrados por execução; amostra pequena descritiva, nearest-rank; sem sessão, DB ou chamadas externas; não representa borda AWS ou RUM",
      fieldRum: false,
      summaries,
      runs,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(summaries, null, 2));
