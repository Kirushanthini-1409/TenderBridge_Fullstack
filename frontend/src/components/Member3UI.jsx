import { useState } from 'react';
import { explainError } from '../services/api.js';

export function PageHeading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <div className="heading-action">{action}</div>}</div>;
}

export function Panel({ title, note, children, className = '' }) {
  return <section className={`panel ${className}`}><div className="panel-heading"><div><h2>{title}</h2>{note && <p>{note}</p>}</div></div>{children}</section>;
}

export function Field({ label, children, hint }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function Notice({ kind = 'info', children, onDismiss }) {
  return <div className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}><span>{children}</span>{onDismiss && <button className="icon-button" aria-label="Dismiss message" onClick={onDismiss}>×</button>}</div>;
}

export function ErrorText({ error }) {
  return error ? <Notice kind="error">{explainError(error)}</Notice> : null;
}

export function Loading({ label = 'Loading…' }) {
  return <div className="loading"><span className="spinner" />{label}</div>;
}

export function useAsyncAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  async function run(action) {
    setBusy(true); setError(null);
    try { return await action(); } catch (e) { setError(e); return undefined; } finally { setBusy(false); }
  }
  return { busy, error, setError, run };
}

export function EmptyState({ icon = '◌', title, children }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{children}</p></div>;
}

export function StatusPill({ children, tone = 'neutral' }) {
  return <span className={`status-pill tone-${tone}`}>{children}</span>;
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function getRows(data, keys = ['items', 'data', 'applications', 'tenders', 'partners', 'listings', 'requests']) {
  if (Array.isArray(data)) return data;
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  return [];
}
