import { NextRequest, NextResponse } from "next/server";
import {
  settings,
  cookieHeader,
  flowCookie,
  sessionCookie,
} from "../../../../lib/security";
export const dynamic = "force-dynamic";
// Fixed authentication bridge, not a generic URL proxy or domain API.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params;
  if (!["login", "callback"].includes(action))
    return new Response(null, { status: 404 });
  try {
    const config = settings();
    const target = new URL(`/v1/auth/${action}`, config.apiOrigin);
    if (action === "callback") {
      if (
        [...request.nextUrl.searchParams.keys()].some(
          (k) =>
            ![
              "code",
              "state",
              "error",
              "error_description",
              "iss",
              "session_state",
            ].includes(k),
        )
      )
        return new Response(null, { status: 400 });
      if (request.nextUrl.search.length > 8192)
        return new Response(null, { status: 400 });
      target.search = request.nextUrl.search;
    } else if (request.nextUrl.search)
      return new Response(null, { status: 400 });
    const upstream = await fetch(target, {
      headers: { Cookie: cookieHeader(request.cookies.getAll()) },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    if (upstream.status !== 302)
      return NextResponse.redirect(
        new URL("/entrar?estado=indisponivel", config.appOrigin),
        303,
      );
    const location = upstream.headers.get("Location");
    if (!location) throw new Error();
    const redirect = new URL(location);
    // Login destination is trusted from the fixed API. Callback destination must be our exact origin.
    if (
      redirect.username ||
      redirect.password ||
      (redirect.protocol !== "https:" &&
        !(
          (process.env.VENDA_WEB_LOCAL_TEST === "true" || process.env.VENDA_WEB_LOCAL_DEVELOPMENT === "true") &&
          redirect.hostname === "127.0.0.1"
        )) ||
      (action === "callback" && redirect.origin !== config.appOrigin)
    )
      throw new Error();
    const response = NextResponse.redirect(
      action === "callback" ? new URL("/app", config.appOrigin) : redirect,
      302,
    );
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    for (const cookie of upstream.headers.getSetCookie()) {
      if (
        [sessionCookie, flowCookie].some((name) =>
          cookie.startsWith(`${name}=`),
        ) &&
        /;\s*Secure/i.test(cookie) &&
        /;\s*HttpOnly/i.test(cookie) &&
        /;\s*Path=\//i.test(cookie) &&
        /;\s*SameSite=Lax/i.test(cookie) &&
        !/;\s*Domain=/i.test(cookie)
      )
        response.headers.append("Set-Cookie", cookie);
    }
    return response;
  } catch {
    return new Response(
      "Não foi possível acessar o serviço de identidade. Volte e tente novamente.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
