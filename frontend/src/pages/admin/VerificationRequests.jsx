import { useEffect, useMemo, useState } from 'react';
import StatCard from '../../components/dashboard/StatCard.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { ConfirmDialog, EmptyState, ErrorState, Field, FilterBar, LoadingState, Modal, PageHeader, SearchField } from '../../components/common/ProcurementUI.jsx';
import { approvalService } from '../../services/procurementService.js';
import { formatDate, getRows, humanize } from '../../utils/formatters.js';

export default function VerificationRequests() {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null); const [query, setQuery] = useState(''); const [status, setStatus] = useState('ALL'); const [type, setType] = useState('ALL'); const [selected, setSelected] = useState(null); const [decision, setDecision] = useState(null); const [actionError, setActionError] = useState(null); const [busy, setBusy] = useState(false);
  async function load() { setLoading(true); setError(null); try { setRows(getRows(await approvalService.list())); } catch (requestError) { setError(requestError); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const types = [...new Set(rows.map(row => row.type || row.kind).filter(Boolean))].sort();
  const statuses = [...new Set(rows.map(row => row.status).filter(Boolean))].sort();
  const counts = { pending: rows.filter(row => ['PENDING', 'SUBMITTED', 'UNDER_REVIEW'].includes(String(row.status || '').toUpperCase())).length, approved: rows.filter(row => String(row.status || '').toUpperCase() === 'APPROVED').length, rejected: rows.filter(row => String(row.status || '').toUpperCase() === 'REJECTED').length };
  const visible = useMemo(() => rows.filter(row => {
    const searchable = `${row.organizationName || ''} ${row.businessName || ''} ${row.contactPerson || ''} ${row.email || ''} ${row.registrationNo || ''}`.toLowerCase();
    return searchable.includes(query.trim().toLowerCase()) && (status === 'ALL' || row.status === status) && (type === 'ALL' || (row.type || row.kind) === type);
  }), [rows, query, status, type]);

  async function confirmDecision() {
    setBusy(true); setActionError(null);
    try { await approvalService.decide(selected.id, { decision }); setDecision(null); setSelected(null); await load(); }
    catch (requestError) { setActionError(requestError); setDecision(null); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeader eyebrow="ADMINISTRATION" title="Verification requests" description="Review organization and procurement submissions when approval services are connected." action={<button className="button button-secondary" onClick={load} disabled={loading}>Refresh queue</button>} />
    <section className="stat-grid stat-grid-three" aria-label="Approval summary"><StatCard label="Pending" value={loading || error ? '—' : counts.pending} detail="Awaiting review" /><StatCard label="Approved" value={loading || error ? '—' : counts.approved} detail="Status returned by the service" /><StatCard label="Rejected" value={loading || error ? '—' : counts.rejected} detail="Status returned by the service" /></section>
    {actionError && <ErrorState error={actionError} />}
    <section className="panel"><div className="panel-header"><div><h2>Approval queue</h2><p>Review only the applicant and verification details provided by the service.</p></div></div>
      <FilterBar><SearchField label="Search requests" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search organization or contact" /><Field label="Type"><select value={type} onChange={event => setType(event.target.value)}><option value="ALL">All types</option>{types.map(value => <option key={value} value={value}>{value}</option>)}</select></Field><Field label="Status"><select value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">All statuses</option>{statuses.map(value => <option key={value} value={value}>{humanize(value)}</option>)}</select></Field></FilterBar>
      {loading ? <LoadingState label="Loading requests…" /> : error ? <ErrorState error={error} onRetry={load} /> : visible.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th scope="col">Applicant / organization</th><th scope="col">Type</th><th scope="col">Submitted</th><th scope="col">Verification</th><th scope="col">Status</th><th scope="col">Review</th></tr></thead><tbody>{visible.map(row => <tr key={row.id}><td><strong>{row.organizationName || row.businessName || 'Applicant'}</strong><span className="table-secondary">{row.contactPerson || row.email || row.registrationNo || 'Details not supplied'}</span></td><td>{humanize(row.type || row.kind || 'Request')}</td><td>{formatDate(row.createdAt || row.submittedAt)}</td><td>{Array.isArray(row.documents) && row.documents.length ? `${row.documents.length} supporting documents` : 'No document data'}</td><td><StatusBadge status={row.status} /></td><td><button type="button" className="button button-secondary" onClick={() => { setSelected(row); setActionError(null); }}>Review record</button></td></tr>)}</tbody></table></div> : rows.length ? <EmptyState title="No requests match those filters">Try a different search, type, or status.</EmptyState> : <EmptyState title="No requests to review">Requests will appear when the approval queue service is available.</EmptyState>}
    </section>
    {selected && <Modal title={selected.organizationName || selected.businessName || 'Applicant record'} description="Information supplied for verification." onClose={() => setSelected(null)}><div className="detail-grid"><Detail label="Request type" value={humanize(selected.type || selected.kind || '')} /><Detail label="Status" value={humanize(selected.status || '')} /><Detail label="Contact person" value={selected.contactPerson} /><Detail label="Email" value={selected.email || selected.contactEmail} /><Detail label="Phone" value={selected.contactPhone} /><Detail label="Registration number" value={selected.registrationNo} /><Detail label="Submitted" value={formatDate(selected.createdAt || selected.submittedAt)} /></div>{Array.isArray(selected.documents) && selected.documents.length > 0 && <div className="document-list"><h3>Supporting documents</h3>{selected.documents.map((document, index) => document.url ? <a key={document.id || index} href={document.url} target="_blank" rel="noreferrer">{document.name || `Document ${index + 1}`}</a> : <span key={document.id || index}>{document.name || `Document ${index + 1}`}</span>)}</div>}{actionError && <ErrorState error={actionError} />}<div className="dialog-actions"><button className="button button-secondary" onClick={() => setSelected(null)}>Close</button><button className="button button-secondary" disabled title="A request-changes operation has not been defined">Request changes</button><button className="button button-danger" onClick={() => setDecision('REJECT')}>Reject</button><button className="button button-primary" onClick={() => setDecision('APPROVE')}>Approve</button></div></Modal>}
    {decision && <ConfirmDialog title={`${humanize(decision)} request?`} description="This action requires an available approval service. No decision will be recorded until the backend supports it." confirmLabel={humanize(decision)} danger={decision === 'REJECT'} busy={busy} onClose={() => setDecision(null)} onConfirm={confirmDecision} />}
  </>;
}

function Detail({ label, value }) {
  return <div className="detail-item"><dt>{label}</dt><dd>{value || '—'}</dd></div>;
}
