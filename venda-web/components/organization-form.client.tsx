"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { organizationInput, initialForm } from "../lib/validation";
import { saveOrganization } from "../app/actions";
export function OrganizationForm({
  id = null,
  intentKey,
  name = "",
  timezone = "",
}: {
  id?: string | null;
  intentKey: string;
  name?: string;
  timezone?: string;
}) {
  const [state, action, pending] = useActionState(
    saveOrganization.bind(null, id, intentKey),
    initialForm,
  );
  const [localError, setLocalError] = useState("");
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status === "error") feedback.current?.focus();
  }, [state]);
  return (
    <form
      action={action}
      className="vf-stack"
      // Success redirects. Errors must keep the user's draft and intent key.
      onReset={(event) => event.preventDefault()}
      onSubmit={(event) => {
        const form = new FormData(event.currentTarget);
        const result = organizationInput.safeParse({
          name: form.get("name"),
          timezone: form.get("timezone"),
        });
        if (!result.success) {
          event.preventDefault();
          setLocalError(result.error.issues[0]!.message);
          requestAnimationFrame(() => feedback.current?.focus());
        } else setLocalError("");
      }}
    >
      <div
        ref={feedback}
        tabIndex={-1}
        role={state.status === "error" || localError ? "alert" : undefined}
      >
        {(state.message || localError) && (
          <p className="vf-notice">{localError || state.message}</p>
        )}
        {state.requestId && (
          <p className="vf-hint">Referência: {state.requestId}</p>
        )}
      </div>
      <div className="vf-field">
        <label htmlFor="org-name">Nome da organização (obrigatório)</label>
        <input
          id="org-name"
          name="name"
          defaultValue={name}
          required
          maxLength={120}
          autoComplete="organization"
          aria-invalid={!!state.fields?.name}
          aria-describedby={state.fields?.name ? "name-error" : undefined}
        />
        {state.fields?.name && <p id="name-error">{state.fields.name}</p>}
      </div>
      <div className="vf-field">
        <label htmlFor="org-timezone">Fuso horário IANA (obrigatório)</label>
        <input
          id="org-timezone"
          name="timezone"
          defaultValue={timezone}
          required
          maxLength={100}
          autoComplete="off"
          placeholder="Ex.: America/Sao_Paulo"
          aria-invalid={!!state.fields?.timezone}
          aria-describedby="timezone-hint timezone-error"
        />
        <p id="timezone-hint" className="vf-hint">
          Informe o fuso da organização. Idioma: português do Brasil. Moeda:
          BRL.
        </p>
        <p id="timezone-error">{state.fields?.timezone}</p>
      </div>
      <button
        className="vf-button vf-button-primary"
        type="submit"
        disabled={pending}
        aria-busy={pending}
      >
        {pending
          ? "Aguardando confirmação…"
          : id
            ? "Salvar organização"
            : "Criar minha organização"}
      </button>
      <p className="vf-hint">
        Criar ou atualizar uma organização não ativa mensagens, automações ou
        assinatura.
      </p>
    </form>
  );
}
