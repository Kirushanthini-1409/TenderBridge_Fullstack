import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { EmptyState, ErrorState, Field, FilterBar, LoadingState, Modal, PageHeader, SearchField } from '../../components/common/ProcurementUI.jsx';
import { organizationProcurementService } from '../../services/procurementService.js';
import { formatDate, getRows, humanize } from '../../utils/formatters.js';

export default function ManageListings() {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null); const [query, setQuery] = useState(''); const [status, setStatus] = useState('ALL'); const [selected, setSelected] = useState(null);
  async function load() { setLoading(true); setError(null); try { setRows(getRows(await organizationProcurementService.listMine())); } catch (requestError) { setError(requestError); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const statuses = [...new Set(rows.map(row => row.status).filter(Boolean))].sort();
  const visible = useMemo(() => rows.filter(row => `${row.title || ''} ${row.category || ''} ${row.referenceNumber || ''}`.toLowerCase().includes(query.trim().toLowerCase()) && (status === 'ALL' || row.status === status)), [rows, query, status]);

  return <>
    <PageHeader eyebrow="ORGANIZATION WORKSPACE" title="Manage listings" description="Review procurement opportunities and their current publication status." action={<Link className="button button-primary" to="/org/procurements/new">Create procurement</Link>} />
    <section className="panel"><div className="panel-header"><div><h2>All procurement listings</h2><p>Actions that change listing status will be enabled when the backend contract is available.</p></div></div>
      <FilterBar><SearchField label="Search listings" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search title, category, or reference" /><Field label="Status"><select value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">All statuses</option>{statuses.map(value => <option key={value} value={value}>{humanize(value)}</option>)}</select></Field></FilterBar>
      {loading ? <LoadingState label="Loading procurement listings…" /> : error ? <ErrorState error={error} onRetry={load} /> : visible.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th scope="col">Title</th><th scope="col">Status</th><th scope="col">Created</th><th scope="col">Deadline</th><th scope="col">Actions</th></tr></thead><tbody>{visible.map(row => <tr key={row.id}><td><strong>{row.title || 'Untitled procurement'}</strong><span className="table-secondary">{row.category || row.referenceNumber || '—'}</span></td><td><StatusBadge status={row.status} /></td><td>{formatDate(row.createdAt)}</td><td>{formatDate(row.submissionDeadline)}</td><td><div className="table-actions"><button type="button" className="button button-tertiary" onClick={() => setSelected(row)}>View</button><button type="button" className="button button-tertiary" disabled title="Editing will be available when an update contract is defined">Edit</button></div></td></tr>)}</tbody></table></div> : rows.length ? <EmptyState title="No listings match your filters">Change the search or status filter to see other listings.</EmptyState> : <EmptyState title="No procurement listings yet" action={<Link className="button button-primary" to="/org/procurements/new">Create procurement</Link>}>Your opportunities will appear here after the publishing workflow is connected.</EmptyState>}
    </section>
    {selected && <Modal title={selected.title || 'Procurement details'} description="Listing information available from the current tender record." onClose={() => setSelected(null)}><div className="detail-grid"><Detail label="Reference" value={selected.referenceNumber} /><Detail label="Type" value={selected.type && humanize(selected.type)} /><Detail label="Category" value={selected.category} /><Detail label="Status" value={selected.status && humanize(selected.status)} /><Detail label="Location" value={selected.location} /><Detail label="Estimated value" value={selected.estimatedValue != null ? String(selected.estimatedValue) : null} /><Detail label="Submission deadline" value={formatDate(selected.submissionDeadline)} /><Detail label="Created" value={formatDate(selected.createdAt)} /></div><div className="dialog-actions"><button className="button button-secondary" onClick={() => setSelected(null)}>Close</button><button className="button button-secondary" disabled title="Status changes are not connected">Publish or close</button></div></Modal>}
  </>;
}

function Detail({ label, value }) {
  return <div className="detail-item"><dt>{label}</dt><dd>{value || '—'}</dd></div>;
}
