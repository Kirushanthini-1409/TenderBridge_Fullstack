import { useEffect, useMemo, useState } from 'react';
import { applicationsService } from '../../services/member3Service.js';
import { EmptyState, ErrorText, Loading, PageHeading, Panel, StatusPill, formatDate, getRows, useAsyncAction } from '../../components/Member3UI.jsx';

const statuses = ['INTERESTED', 'SUBMITTED', 'UNDER_EVALUATION', 'RESULT_RELEASED'];
const readable = (value = '') => value.toLowerCase().replaceAll('_', ' ').replace(/^\w/, c => c.toUpperCase());
const tone = (s = '') => ({ INTERESTED: 'blue', SUBMITTED: 'violet', UNDER_EVALUATION: 'amber', RESULT_RELEASED: 'green' }[s] || 'neutral');

export default function ApplicationTracker() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [editing, setEditing] = useState(null);
  const action = useAsyncAction();

  async function load() {
    setLoading(true); setLoadError(null);
    try { setRows(getRows(await applicationsService.list())); } catch (e) { setLoadError(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  const visible = useMemo(() => rows.filter(row => filter === 'ALL' || row.status === filter), [rows, filter]);

  async function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = { ...editing, status: form.get('status'), notes: form.get('notes'), referenceNo: form.get('referenceNo'), submissionDate: form.get('submissionDate') || null };
    const result = await action.run(() => applicationsService.createOrUpdate(next));
    if (result !== undefined) { setEditing(null); await load(); }
  }

  return <>
    <PageHeading eyebrow="BUSINESS WORKSPACE" title="Application tracker" description="Keep your tender responses and outcomes in one place." action={<button className="button button-secondary" onClick={load}>↻ Refresh</button>} />
    <div className="stat-grid compact-stats"><div className="stat-card"><span>Tracked</span><strong>{rows.length}</strong><small>Applications</small></div>{statuses.slice(0, 3).map(s => <div className="stat-card" key={s}><span>{readable(s)}</span><strong>{rows.filter(r => r.status === s).length}</strong><small>Applications</small></div>)}</div>
    <Panel title="Your applications" note="Update the details you track after applying through the official tender portal.">
      <div className="toolbar"><label className="filter-label">Status <select value={filter} onChange={e => setFilter(e.target.value)}><option value="ALL">All statuses</option>{statuses.map(s => <option key={s} value={s}>{readable(s)}</option>)}</select></label></div>
      {loadError && <ErrorText error={loadError} />}{action.error && <ErrorText error={action.error} />}
      {loading ? <Loading label="Loading applications…" /> : visible.length === 0 ? <EmptyState title="No applications to show">When you track interest in a tender, it will appear here.</EmptyState> : <div className="table-wrap"><table><thead><tr><th>Tender</th><th>Status</th><th>Deadline</th><th>Submission reference</th><th>Updated</th><th /></tr></thead><tbody>{visible.map(row => <tr key={row.id}><td><strong>{row.tender?.title || row.tenderTitle || 'Tender'}</strong><small>{row.tender?.referenceNumber || row.referenceNumber || row.tenderId || ''}</small></td><td><StatusPill tone={tone(row.status)}>{readable(row.status)}</StatusPill></td><td>{formatDate(row.tender?.submissionDeadline || row.submissionDeadline)}</td><td>{row.referenceNo || '—'}</td><td>{formatDate(row.updatedAt || row.submissionDate)}</td><td><button className="button button-small button-secondary" onClick={() => setEditing(row)}>Update</button></td></tr>)}</tbody></table></div>}
    </Panel>
    {editing && <div className="modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && setEditing(null)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-title"><div className="modal-title"><div><div className="eyebrow">APPLICATION DETAILS</div><h2 id="edit-title">Update application</h2></div><button className="icon-button" onClick={() => setEditing(null)} aria-label="Close">×</button></div><p className="muted">{editing.tender?.title || editing.tenderTitle || 'Tender'}</p><form onSubmit={save} className="form-stack"><label className="field"><span>Status</span><select name="status" defaultValue={editing.status}>{statuses.map(s => <option key={s} value={s}>{readable(s)}</option>)}</select></label><label className="field"><span>Submission reference</span><input name="referenceNo" defaultValue={editing.referenceNo || ''} placeholder="Optional reference number" /></label><label className="field"><span>Submission date</span><input type="date" name="submissionDate" defaultValue={editing.submissionDate?.slice(0, 10) || ''} /></label><label className="field"><span>Private notes</span><textarea name="notes" rows="3" defaultValue={editing.notes || ''} placeholder="Notes for your team" /></label><div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="button button-primary" disabled={action.busy}>{action.busy ? 'Saving…' : 'Save update'}</button></div></form></section></div>}
  </>;
}
