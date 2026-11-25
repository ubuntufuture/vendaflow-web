export const sessionCookie = "__Host-venda_session";
export const flowCookie = "__Host-venda_oidc";
export class WebFault extends Error {
  constructor(
    public readonly status: number,
    public readonly requestId?: string,
  ) {
    super(`Falha ${status}`);
  }
}
export function settings(env: NodeJS.ProcessEnv = process.env) {
  function origin(name: string) {
    const raw = env[name];
    if (!raw) throw new WebFault(503);
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      throw new WebFault(503);
    }
    const local =
      (env.VENDA_WEB_LOCAL_TEST === "true" || env.VENDA_WEB_LOCAL_DEVELOPMENT === "true") &&
      ["127.0.0.1", "localhost"].includes(u.hostname);
    if (
      u.username ||
      u.password ||
      u.pathname !== "/" ||
      u.search ||
      u.hash ||
      (u.protocol !== "https:" && !(local && u.protocol === "http:"))
    )
      throw new WebFault(503);
    return u.origin;
  }
  return {
    appOrigin: origin("VENDA_WEB_ORIGIN"),
    apiOrigin: origin("VENDA_API_INTERNAL_ORIGIN"),
  };
}
export function safeCookie(value: string | undefined) {
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
}
export function originAllowed(value: string | null, expected: string) {
  return value === expected;
}
export function cookieHeader(cookies: { name: string; value: string }[]) {
  return cookies
    .filter(
      (c) =>
        [sessionCookie, flowCookie].includes(c.name) && safeCookie(c.value),
    )
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}
export const faultCopy: Record<number, { title: string; description: string }> =
  {
    400: {title:'Revise as informações',description:'Confira os campos e os filtros informados antes de tentar novamente.'},
    413: {title:'Conteúdo acima do limite',description:'Reduza o tamanho do conteúdo e tente novamente. O rascunho foi preservado.'},
    429: {title:'Aguarde antes de tentar novamente',description:'O limite de solicitações foi atingido. Aguarde e consulte o estado antes de reenviar.'},
    401: {
      title: "Sua sessão precisa ser renovada",
      description: "Entre novamente para continuar com segurança.",
    },
    403: {
      title: "Acesso não permitido",
      description: "Solicite ao responsável uma revisão das suas permissões.",
    },
    404: {
      title: "Conteúdo não encontrado",
      description:
        "O endereço pode ter mudado ou não estar disponível para você.",
    },
    409: {
      title: "Precisamos revisar esta operação",
      description: "Consulte a organização antes de repetir a ação.",
    },
    500: {
      title: "Não foi possível concluir",
      description:
        "Tente novamente. Nenhuma alteração foi confirmada nesta tela.",
    },
    503: {
      title: "Serviço temporariamente indisponível",
      description:
        "Tente novamente em instantes. Não foi possível consultar o estado atual.",
    },
    504: {
      title: "A confirmação demorou mais que o esperado",
      description:
        "Consulte suas organizações antes de repetir. Ao reenviar este formulário, a mesma intenção será usada.",
    },
  };
