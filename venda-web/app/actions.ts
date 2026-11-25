"use server";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api, me, unwrap } from "../lib/api.server";
import {
  settings,
  originAllowed,
  sessionCookie,
  flowCookie,
  WebFault,
  faultCopy,
} from "../lib/security";
import { organizationInput, uuid, type FormState } from "../lib/validation";
async function sameOrigin() {
  if (!originAllowed((await headers()).get("origin"), settings().appOrigin))
    throw new WebFault(403);
}
export async function saveOrganization(
  id: string | null,
  key: string,
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  let destination: string;
  try {
    await sameOrigin();
    if (
      !uuid.safeParse(key).success ||
      (id !== null && !uuid.safeParse(id).success)
    )
      throw new WebFault(400);
    const input = organizationInput.safeParse({
      name: form.get("name"),
      timezone: form.get("timezone"),
    });
    if (!input.success) {
      const errors = input.error.flatten().fieldErrors;
      return {
        status: "error",
        message: "Revise os campos indicados.",
        fields: {
          ...(errors.name?.[0] ? { name: errors.name[0] } : {}),
          ...(errors.timezone?.[0] ? { timezone: errors.timezone[0] } : {}),
        },
      };
    }
    const session = await me();
    const client = await api();
    const auth = { "X-CSRF-Token": session.csrfToken, "Idempotency-Key": key };
    const organization =
      id === null
        ? unwrap(
            await client.POST("/v1/organizations", {
              body: input.data,
              params: { header: auth },
            }),
          )
        : unwrap(
            await client.PATCH("/v1/organizations/{organizationId}", {
              body: input.data,
              params: { path: { organizationId: id }, header: auth },
            }),
          );
    destination = `/app/o/${organization.id}${id ? "/configuracoes/organizacao" : ""}`;
  } catch (error) {
    const fault = error instanceof WebFault ? error : new WebFault(500);
    return {
      status: "error",
      message: (faultCopy[fault.status] ?? faultCopy[500]!).description,
      ...(fault.requestId ? { requestId: fault.requestId } : {}),
    };
  }
  redirect(destination);
}
export async function logout() {
  await sameOrigin();
  let revocationPending = false;
  try {
    const session = await me();
    const result = await (
      await api()
    ).POST("/v1/auth/logout", {
      params: { header: { "X-CSRF-Token": session.csrfToken } },
    });
    if (!result.response.ok) throw new WebFault(result.response.status);
  } catch (error) {
    revocationPending = !(error instanceof WebFault) || error.status !== 401;
  }
  const jar = await cookies();
  for (const name of [sessionCookie, flowCookie])
    jar.set(name, "", {
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  redirect(revocationPending ? "/entrar?estado=saida-pendente" : "/entrar");
}
