import { describe, it, expect } from "vitest";
import {
  settings,
  cookieHeader,
  safeCookie,
  originAllowed,
  WebFault,
} from "../lib/security";
import { organizationInput } from "../lib/validation";
import { visibleModules } from "../lib/modules";
import { isLocalReview } from "../lib/review";
const config = {
  VENDA_WEB_ORIGIN: "https://web.example.test",
  VENDA_API_INTERNAL_ORIGIN: "https://api.example.test",
};
describe("Configuração e isolamento do transporte", () => {
  it("exige origens explícitas e não revela valores ausentes", () => {
    expect(() => settings({})).toThrow(WebFault);
  });
  it.each([
    "http://remote.example.test",
    "https://user:secret@example.test",
    "https://api.example.test/path",
    "https://api.example.test/?secret=x",
    "file:///etc/passwd",
    "https://api.example.test/#fragment",
  ])("recusa destino inválido %s", (value) => {
    expect(() =>
      settings({ ...config, VENDA_API_INTERNAL_ORIGIN: value }),
    ).toThrow(WebFault);
  });
  it("permite HTTP apenas em loopback com opção explícita de harness", () => {
    expect(() =>
      settings({
        ...config,
        VENDA_API_INTERNAL_ORIGIN: "http://127.0.0.1:3201",
      }),
    ).toThrow();
    expect(
      settings({
        VENDA_WEB_LOCAL_TEST: "true",
        VENDA_WEB_ORIGIN: "http://127.0.0.1:3400",
        VENDA_API_INTERNAL_ORIGIN: "http://127.0.0.1:3201",
      }).apiOrigin,
    ).toBe("http://127.0.0.1:3201");
    const review = {
      VENDA_REVIEW_MODE: "DEMO_ONLY",
      VENDA_WEB_LOCAL_TEST: "true",
      VENDA_WEB_ORIGIN: "http://127.0.0.1:3400",
      VENDA_API_INTERNAL_ORIGIN: "http://127.0.0.1:3201",
    };
    expect(isLocalReview(review)).toBe(true);
    expect(
      isLocalReview({
        ...review,
        VENDA_WEB_ORIGIN: "https://web.example.test",
      }),
    ).toBe(false);
    expect(isLocalReview({ ...review, VENDA_REVIEW_MODE: "" })).toBe(false);
  });
  it("repassa apenas cookies opacos de autenticação e ignora conteúdo de outros sistemas", () => {
    const token = "x".repeat(43);
    expect(
      cookieHeader([
        { name: "__Host-venda_session", value: token },
        { name: "outro_produto", value: token },
        { name: "__Host-venda_oidc", value: "malicioso\r\nHeader:x" },
        { name: "vf-theme", value: "dark" },
      ]),
    ).toBe(`__Host-venda_session=${token}`);
    expect(safeCookie("")).toBeUndefined();
  });
  it("exige Origin exato para mutação, sem confiar em host ou prefixo", () => {
    expect(
      originAllowed(config.VENDA_WEB_ORIGIN, config.VENDA_WEB_ORIGIN),
    ).toBe(true);
    for (const value of [
      null,
      "https://web.example.test.evil.test",
      "null",
      "https://evil.test",
    ])
      expect(originAllowed(value, config.VENDA_WEB_ORIGIN)).toBe(false);
  });
});
describe("Onboarding sem pressupor permissões ou consentimento", () => {
  it("valida nome, tamanho e timezone IANA", () => {
    for (const data of [
      { name: " ", timezone: "America/Sao_Paulo" },
      { name: "X".repeat(121), timezone: "UTC" },
      { name: "DEMO_ONLY", timezone: "inexistente" },
      { name: "DEMO_ONLY", timezone: "UTC", role: "owner" },
    ])
      expect(organizationInput.safeParse(data).success).toBe(false);
    expect(
      organizationInput.parse({
        name: " DEMO_ONLY ",
        timezone: "America/Sao_Paulo",
      }),
    ).toEqual({ name: "DEMO_ONLY", timezone: "America/Sao_Paulo" });
    const missing = organizationInput.safeParse({ name: null, timezone: null });
    expect(missing.success).toBe(false);
    if (!missing.success)
      expect(missing.error.issues.map((issue) => issue.message)).toEqual([
        "Informe o nome da organização.",
        "Informe o fuso horário IANA.",
      ]);
  });
  it("separa navegação financeira de operações comerciais", () => {
    expect(visibleModules("billing").map((m) => m.slug)).toEqual([
      "",
      "faturamento",
      "ajuda",
    ]);
  });
  it("não oferece edição organizacional a viewer", () => {
    expect(
      visibleModules("viewer").some(
        (m) => m.slug === "configuracoes/organizacao",
      ),
    ).toBe(false);
  });
});
