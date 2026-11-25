'use client';
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Icon, type IconName } from './icons';

export function Wordmark({ inverse = false }: { inverse?: boolean }) {
  return <span className={`vf-wordmark${inverse ? ' vf-wordmark-inverse' : ''}`} role="img" aria-label="Venda Flow AI"><img src="/brand/venda-flow-symbol.png" width="42" height="42" alt="" className="vf-brand-symbol"/><span>Venda Flow <span className="vf-brand-ai">AI</span></span></span>;
}
export function Button({ variant = 'primary', busy = false, children, className = '', disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet'; busy?: boolean }) {
  return <button type="button" {...props} disabled={disabled || busy} aria-busy={busy || undefined} className={`vf-button vf-button-${variant} ${className}`}>{busy && <span className="vf-spinner" aria-hidden="true" />}{children}</button>;
}
export function Badge({ children, tone = 'neutral', icon }: { children: ReactNode; tone?: 'neutral' | 'attention' | 'success' | 'error'; icon?: IconName }) {
  return <span className={`vf-badge vf-badge-${tone}`}>{icon && <Icon name={icon} />}{children}</span>;
}
export function Field({ label, hint, error, required, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const generated = useId(); const id = props.id ?? generated;
  const description = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return <div className="vf-field"><label htmlFor={id}>{label}{required && <span> (obrigatório)</span>}</label>{hint && <p id={`${id}-hint`} className="vf-hint">{hint}</p>}<input {...props} id={id} required={required} aria-invalid={!!error} aria-describedby={description} />{error && <p className="vf-field-error" id={`${id}-error`}><Icon name="warning" />{error}</p>}</div>;
}
export function Textarea({ label, hint, error, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string }) {
  const generated = useId(); const id = props.id ?? generated;
  return <div className="vf-field"><label htmlFor={id}>{label}</label>{hint && <p id={`${id}-hint`} className="vf-hint">{hint}</p>}<textarea {...props} id={id} aria-invalid={!!error} aria-describedby={[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined} />{error && <p id={`${id}-error`} className="vf-field-error">{error}</p>}</div>;
}
export function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const generated = useId(); const id = props.id ?? generated;
  return <div className="vf-field"><label htmlFor={id}>{label}</label><select {...props} id={id}>{children}</select></div>;
}
export function Checkbox({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const generated = useId(); const id = props.id ?? generated;
  return <div className="vf-check"><input {...props} id={id} type="checkbox" aria-describedby={hint ? `${id}-hint` : undefined} /><div><label htmlFor={id}>{label}</label>{hint && <p id={`${id}-hint`} className="vf-hint">{hint}</p>}</div></div>;
}
export function Panel({ title, children, action, className = '' }: { title?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return <section className={`vf-panel ${className}`}>{title && <div className="vf-panel-heading"><h2>{title}</h2>{action}</div>}{children}</section>;
}
export function EmptyState({ title, description, icon = 'folder', action }: { title: string; description: string; icon?: IconName; action?: ReactNode }) {
  return <div className="vf-empty"><span className="vf-empty-icon"><Icon name={icon} /></span><h2>{title}</h2><p>{description}</p>{action}</div>;
}
export const stateNames = ['loading', 'empty', 'error', 'forbidden', 'timeout', 'success', 'stale'] as const;
export type ViewState = typeof stateNames[number];
const stateCopy: Record<Exclude<ViewState, 'loading' | 'empty'>, { title: string; description: string; icon: IconName }> = {
  error: { title: 'Não foi possível carregar', description: 'Tente novamente. Nenhuma operação foi confirmada.', icon: 'warning' },
  forbidden: { title: 'Acesso não permitido', description: 'Seu acesso não permite visualizar este conteúdo. Volte para uma área autorizada.', icon: 'lock' },
  timeout: { title: 'Ainda não foi possível confirmar', description: 'Consulte o estado da operação antes de tentar novamente para evitar duplicidade.', icon: 'clock' },
  success: { title: 'Confirmação recebida', description: 'Exemplo de apresentação de um retorno confirmado, exclusivo do catálogo de componentes.', icon: 'check' },
  stale: { title: 'Dados precisam de atualização', description: 'O estado atual não foi confirmado. Atualize antes de decidir ou executar uma ação.', icon: 'clock' },
};
export function StateView({ state, onRetry }: { state: ViewState; onRetry?: () => void }) {
  if (state === 'loading') return <div className="vf-loading" role="status" aria-live="polite" aria-busy="true"><span className="vf-spinner" aria-hidden="true" /><p>Carregando conteúdo…</p><div className="vf-skeleton" /><div className="vf-skeleton vf-skeleton-short" /></div>;
  if (state === 'empty') return <EmptyState title="Nenhum registro disponível" description="Os registros aparecerão aqui quando estiverem disponíveis para sua organização." />;
  const copy = stateCopy[state];
  return <div className={`vf-state vf-state-${state}`} role={state === 'error' ? 'alert' : 'status'}><Icon name={copy.icon} /><h2>{copy.title}</h2><p>{copy.description}</p>{onRetry && <Button variant="secondary" onClick={onRetry}>{state === 'timeout' ? 'Consultar estado' : 'Tentar novamente'}</Button>}</div>;
}
export function DataTable({ caption, columns, children }: { caption: string; columns: string[]; children?: ReactNode }) {
  return <div className="vf-table-scroll" tabIndex={0} role="region" aria-label={caption}><table className="vf-table"><caption>{caption}</caption><thead><tr>{columns.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead><tbody>{children || <tr><td colSpan={columns.length}><p className="vf-table-empty">Nenhum registro disponível para este filtro.</p></td></tr>}</tbody></table></div>;
}
export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null); const id = useId();
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
  }, [open]);
  return <dialog ref={dialog} className="vf-dialog" aria-labelledby={id} onCancel={event => { event.preventDefault(); onClose(); }} onClose={onClose}><div className="vf-panel-heading"><h2 id={id}>{title}</h2><Button variant="quiet" onClick={onClose} aria-label="Fechar diálogo"><Icon name="close" /></Button></div>{children}</dialog>;
}
export function Toast({ children, onDismiss, tone = 'success' }: { children: ReactNode; onDismiss: () => void; tone?: 'success' | 'error' }) {
  return <div className="vf-toast" role={tone === 'error' ? 'alert' : 'status'}><Icon name={tone === 'error' ? 'warning' : 'check'} /><span>{children}</span><Button variant="quiet" onClick={onDismiss} aria-label="Dispensar notificação"><Icon name="close" /></Button></div>;
}
export function Notice({ title, children, icon = 'shield' }: { title: string; children: ReactNode; icon?: IconName }) {
  return <aside className="vf-notice"><Icon name={icon} /><div><strong>{title}</strong><p>{children}</p></div></aside>;
}
