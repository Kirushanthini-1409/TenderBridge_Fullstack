import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { EmptyState, Field, FilterBar, LoadingState, Modal, PageHeader, SearchField } from '../../components/common/ProcurementUI.jsx';
import OrganizationIntegrationState from '../../components/private_org/OrganizationIntegrationState.jsx';
import { organizationProcurementService } from '../../services/procurementService.js';
import { formatDate, getRows, humanize } from '../../utils/formatters.js';

export default function ManageListings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [selected, setSelected] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRows(getRows(await organizationProcurementService.listMine()));
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const statuses = [...new Set(rows.map(row => row.status).filter(Boolean))].sort();
  const visible = useMemo(() => rows.filter(row => {
    const searchable = `${row.title || ''} ${row.category || ''} ${row.referenceNumber || ''}`.toLowerCase();
    return searchable.includes(query.trim().toLowerCase()) && (status === 'ALL' || row.status === status);
  }), [rows, query, status]);
  const hasActiveFilters = Boolean(query.trim()) || status !== 'ALL';

  function clearFilters() {
    setQuery('');
    setStatus('ALL');
  }

  return <>
    <PageHeader eyebrow="ORGANIZATION WORKSPACE" title="Manage listings" description="Review your organization’s procurement opportunities and their publication status." action={<Link className="button button-primary" to="/org/procurements/new">Create procurement</Link>} />
    <section className="panel org-listings-panel">
      <div className="panel-header">
        <div><h2>All procurement listings</h2><p>Review listing details and status. Editing and publication changes depend on the organization workflow.</p></div>
        {hasActiveFilters && <button type="button" className="button button-secondary" onClick={clearFilters}>Clear filters</button>}
      </div>
      <div className="org-listing-filters"><FilterBar>
        <SearchField label="Search listings" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search title, category, or reference" />
        <Field label="Status"><select value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">All statuses</option>{statuses.map(value => <option key={value} value={value}>{humanize(value)}</option>)}</select></Field>
      </FilterBar></div>
      {loading ? <LoadingState label="Loading procurement listings…" /> : error ? <OrganizationIntegrationState title="Procurement listings are unavailable" description="We couldn’t load your organization’s listings. Please try again." error={error} onRetry={load} /> : visible.length ? <>
        <div className="table-scroll org-listing-table"><table className="data-table"><thead><tr><th scope="col">Procurement</th><th scope="col">Status</th><th scope="col">Created</th><th scope="col">Deadline</th><th scope="col">Actions</th></tr></thead><tbody>{visible.map((row, index) => <tr key={row.id || `${row.title || 'listing'}-${index}`}>
          <td><strong>{row.title || 'Untitled procurement'}</strong><span className="table-secondary">{row.category || row.referenceNumber || '—'}</span></td>
          <td><StatusBadge status={row.status} /></td><td>{formatDate(row.createdAt)}</td><td>{formatDate(row.submissionDeadline)}</td>
          <td><div className="table-actions"><button type="button" className="button button-tertiary" onClick={() => setSelected(row)}>View details</button><button type="button" className="button button-tertiary" disabled title="Editing will be available when an update contract is defined">Edit</button></div></td>
        </tr>)}</tbody></table></div>
        <div className="org-listing-cards">{visible.map((row, index) => <ListingCard key={row.id || `${row.title || 'listing'}-${index}`} row={row} onView={setSelected} />)}</div>
      </> : rows.length ? <EmptyState title="No listings match your filters">Adjust your search or status filter, or clear the filters to see all listings.</EmptyState> : <EmptyState title="No procurement listings yet" action={<Link className="button button-primary" to="/org/procurements/new">Create procurement</Link>}>Your organization’s opportunities will appear here when listing services are connected.</EmptyState>}
    </section>
    {selected && <Modal title={selected.title || 'Procurement details'} description="Information available in this procurement record." onClose={() => setSelected(null)}>
      <div className="detail-grid"><Detail label="Reference" value={selected.referenceNumber} /><Detail label="Type" value={selected.type && humanize(selected.type)} /><Detail label="Category" value={selected.category} /><Detail label="Status" value={selected.status && humanize(selected.status)} /><Detail label="Location" value={selected.location} /><Detail label="Estimated value" value={selected.estimatedValue != null ? String(selected.estimatedValue) : null} /><Detail label="Submission deadline" value={formatDate(selected.submissionDeadline)} /><Detail label="Created" value={formatDate(selected.createdAt)} /></div>
      <div className="dialog-actions"><button type="button" className="button button-secondary" onClick={() => setSelected(null)}>Close</button><button type="button" className="button button-secondary" disabled title="Status changes are not connected">Publish or close</button></div>
    </Modal>}
  </>;
}

function ListingCard({ row, onView }) {
  return <article className="org-listing-card">
    <div className="org-listing-card-heading"><div><h3>{row.title || 'Untitled procurement'}</h3><p>{row.category || row.referenceNumber || 'Procurement listing'}</p></div>{row.status && <StatusBadge status={row.status} />}</div>
    <dl className="org-listing-card-details"><div><dt>Created</dt><dd>{formatDate(row.createdAt)}</dd></div><div><dt>Deadline</dt><dd>{formatDate(row.submissionDeadline)}</dd></div></dl>
    <div className="org-listing-card-actions"><button type="button" className="button button-secondary" onClick={() => onView(row)}>View details</button><button type="button" className="button button-tertiary" disabled title="Editing will be available when an update contract is defined">Edit</button></div>
  </article>;
}

function Detail({ label, value }) {
  return <div className="detail-item"><dt>{label}</dt><dd>{value || '—'}</dd></div>;
}
