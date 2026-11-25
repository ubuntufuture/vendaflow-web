import Link from "next/link";
import type { ReactNode } from "react";
import Image from "next/image";
import { faultCopy } from "../lib/security";
export function Wordmark() {
  return (
    <span className="vf-wordmark" role="img" aria-label="Venda Flow AI">
      <Image src="/brand/venda-flow-symbol.png" width={42} height={42} alt="" className="vf-brand-symbol" />
      <span>Venda Flow <span className="vf-brand-ai">AI</span></span>
    </span>
  );
}
export function ActionLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      prefetch={false}
      className={`vf-button vf-button-${secondary ? "secondary" : "primary"}`}
      href={href}
    >
      {children}
    </Link>
  );
}
export function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="vf-panel">
      <div className="vf-panel-heading">
        <h2>{title}</h2>
      </div>
      <div className="vf-panel-body vf-stack-sm">{children}</div>
    </section>
  );
}
export function Fault({
  status = 500,
  requestId,
}: {
  status?: number;
  requestId?: string | undefined;
}) {
  const copy = faultCopy[status] ?? faultCopy[500]!;
  return (
    <section className="vf-state vf-state-error" role="alert">
      <span className="vf-badge">{status}</span>
      <h2>{copy.title}</h2>
      <p>{copy.description}</p>
      {requestId && <p className="vf-hint">Referência: {requestId}</p>}
      <div className="vf-row">
        <ActionLink href={status === 401 ? "/entrar" : "/app"}>
          {status === 401 ? "Entrar novamente" : "Consultar organizações"}
        </ActionLink>
        <ActionLink href="/" secondary>
          Ir ao início
        </ActionLink>
      </div>
    </section>
  );
}
export function Unavailable({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="vf-empty">
      <span className="vf-badge vf-badge-attention">
        Disponibilidade não confirmada
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      <ActionLink href="/app" secondary>
        Consultar organizações
      </ActionLink>
    </section>
  );
}
export function ContentHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="content-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  );
}
export function LoadingBlock() {
  return (
    <div className="vf-loading" role="status" aria-busy="true">
      <p>Consultando organizações…</p>
      <div className="vf-skeleton" />
      <div className="vf-skeleton vf-skeleton-short" />
    </div>
  );
}
