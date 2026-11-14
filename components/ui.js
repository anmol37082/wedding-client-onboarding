'use client';
import Link from 'next/link';
import brand from '../lib/brand';

export function Brand({ href = '/' }) {
  return <Link href={href} className="brand"><span className="mark" aria-hidden="true">{brand.short}</span>{brand.name}</Link>;
}
export function Header({ children }) {
  return <header className="site-head"><div className="wrap"><Brand />{children}</div></header>;
}
export function Field({ label, error, hint, id, children }) {
  return (
    <div className="field">
      <label htmlFor={id}><span className="lbl">{label}</span></label>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="err" id={`${id}-err`} role="alert">{error}</span>}
    </div>
  );
}
export const inputProps = (id, error) => ({ id, className: 'input', 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-err` : undefined });

export function Alert({ kind = 'error', children }) {
  return children ? <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div> : null;
}
export const Loading = ({ text = 'Loading…' }) => <p className="center muted" role="status" style={{ padding: 48 }}>{text}</p>;
export const Empty = ({ children }) => <p className="center muted card" style={{ padding: 40 }}>{children}</p>;

const BADGES = { Approved: ['b-ok', '✓'], Confirmed: ['b-ok', '✓'], Completed: ['b-ok', '✓'], Pending: ['b-warn', '◔'], New: ['b-info', '●'], 'In Review': ['b-warn', '◔'], Rejected: ['b-bad', '✕'], Draft: ['b-info', '✎'] };
export function StatusBadge({ status }) {
  const [cls, icon] = BADGES[status] || ['b-info', '•'];
  return <span className={`badge ${cls}`}><span aria-hidden="true">{icon}</span>{status}</span>;
}
export function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
      <button className="btn btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span className="muted small">Page {page} of {pages}</span>
      <button className="btn btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
}
export function Stepper({ step, labels }) {
  return (
    <ol className="stepper" aria-label="Progress">
      {labels.map((l, i) => <li key={l} data-state={i + 1 < step ? 'done' : i + 1 === step ? 'now' : ''} aria-current={i + 1 === step ? 'step' : undefined}>{i + 1}. {l}</li>)}
    </ol>
  );
}
