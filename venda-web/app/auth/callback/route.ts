import { NextRequest, NextResponse } from "next/server";
import { settings } from "../../../lib/security";
export function GET(request: NextRequest) {
  // Legacy UX path only; never accepts a redirect destination.
  try {
    return NextResponse.redirect(
      new URL(
        `/v1/auth/callback${request.nextUrl.search}`,
        settings().appOrigin,
      ),
      302,
    );
  } catch {
    return new Response("Serviço de identidade indisponível.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
