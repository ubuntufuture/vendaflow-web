import "server-only";
import createClient from "openapi-fetch";
import { cookies } from "next/headers";
import { cache } from "react";
import type { paths, components } from "./api.generated";
import { settings, cookieHeader, WebFault } from "./security";
import { boundedFetch } from "./transport";
export type Organization = components["schemas"]["Organization"];
export type Membership = components["schemas"]["Membership"];
export type Me = components["schemas"]["Me"];
// React cache lasts only for this render request. No shared tenant/session cache.
export const api = cache(async () => {
  const config = settings();
  const jar = await cookies();
  return createClient<paths>({
    baseUrl: config.apiOrigin,
    headers: { Cookie: cookieHeader(jar.getAll()), Origin: config.appOrigin },
    fetch: (request) => boundedFetch(request),
  });
});
export function unwrap<T>(result: { data?: T; response: Response }): T {
  if (!result.response.ok || result.data === undefined) {
    const raw = result.response.headers.get("X-Request-Id");
    throw new WebFault(
      result.response.status,
      raw && /^[a-f\d-]{36}$/i.test(raw) ? raw : undefined,
    );
  }
  return result.data;
}
export const me = cache(async () => unwrap(await (await api()).GET("/v1/me")));
export const organizations = cache(async () => {
  await me();
  return unwrap(await (await api()).GET("/v1/organizations")).data;
});
export const organization = cache(async (id: string) => {
  await me();
  return unwrap(
    await (
      await api()
    ).GET("/v1/organizations/{organizationId}", {
      params: { path: { organizationId: id } },
    }),
  );
});
export const memberships = cache(async (id: string) => {
  await me();
  return unwrap(
    await (
      await api()
    ).GET("/v1/memberships", { params: { query: { organizationId: id } } }),
  ).data;
});
