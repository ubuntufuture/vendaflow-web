import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { serve } from "./serve-ui.mjs";
const server = await serve("storybook-static", 6006);
let browser;
const results = [];
try {
  browser = await chromium.launch({
    executablePath:
      process.env.UI_CHROME_PATH ??
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const index = JSON.parse(fs.readFileSync("storybook-static/index.json"));
  const entries = Object.values(index.entries).filter(
    (e) => ["Venda Web/Fundação", "Venda Web/Stitch ativo"].includes(e.title) && e.type === "story",
  );
  if (entries.length !== 16)
    throw new Error(`Esperadas 16 histórias; encontradas ${entries.length}`);
  for (const entry of entries) {
    await page.goto(
      `http://127.0.0.1:6006/iframe.html?id=${encodeURIComponent(entry.id)}&viewMode=story`,
      { waitUntil: "networkidle" },
    );
    await page.locator("#storybook-root").waitFor();
    const violations = (
      await new AxeBuilder({ page })
        .include("#storybook-root")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations;
    const error = await page.locator(".sb-errordisplay").isVisible();
    const rendered =
      (await page.locator("#storybook-root").innerText()).trim().length > 0;
    results.push({
      id: entry.id,
      status: !error && rendered && violations.length === 0 ? "PASS" : "FAIL",
      rendered,
      ...(error
        ? { error: await page.locator(".sb-errordisplay").innerText() }
        : {}),
      violations: violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    });
  }
} catch (error) {
  results.push({ name: "execução", status: "FAIL", detail: error.message });
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
const evidence = path.resolve(process.env.VENDA_STORYBOOK_EVIDENCE ?? "docs/frontend/evidencias/storybook.json");
if (!evidence.startsWith(process.cwd() + path.sep)) throw new Error("Evidência fora do workspace");
fs.mkdirSync(path.dirname(evidence), {recursive:true});
fs.writeFileSync(
  evidence,
  JSON.stringify({ executedAt: new Date().toISOString(), results }, null, 2) +
    "\n",
);
console.log(JSON.stringify(results, null, 2));
process.exitCode = results.some((r) => r.status === "FAIL") ? 1 : 0;
