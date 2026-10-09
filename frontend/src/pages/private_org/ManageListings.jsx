import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { EmptyState, ErrorState, Field, FilterBar, LoadingState, Modal, PageHeader, SearchField } from '../../components/common/ProcurementUI.jsx';
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
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

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

  function openEditor(row) {
    setSaveError(null);
    setEditing(row);
    setSelected(null);
  }

  async function saveListing(event) {
    event.preventDefault();
    if (!editing || saving) return;
    const form = new FormData(event.currentTarget);
    const optionalNumber = name => form.get(name) === '' ? null : Number(form.get(name));
    const deadline = form.get('submissionDeadline');
    const payload = {
      title: form.get('title').trim(),
      category: form.get('category').trim(),
      description: form.get('description').trim(),
      estimatedValue: optionalNumber('estimatedValue'),
      location: form.get('location').trim() || null,
      submissionDeadline: new Date(deadline).toISOString(),
      minTurnover: optionalNumber('minTurnover') === null ? null : optionalNumber('minTurnover') * 100000,
      minExperienceYears: optionalNumber('minExperienceYears'),
      requiredDocuments: form.get('requiredDocuments').split('\n').map(value => value.trim()).filter(Boolean),
    };
    setSaving(true);
    setSaveError(null);
    try {
      await organizationProcurementService.update(editing.id, payload);
      setEditing(null);
      await load();
    } catch (requestError) {
      setSaveError(requestError);
    } finally {
      setSaving(false);
    }
  }

  return <>
    <PageHeader eyebrow="ORGANIZATION WORKSPACE" title="Manage listings" description="Review your organization’s procurement opportunities and their publication status." action={<Link className="button button-primary" to="/org/procurements/new">Create procurement</Link>} />
    <section className="panel org-listings-panel">
      <div className="panel-header">
        <div><h2>All procurement listings</h2><p>Review and edit listing details. Publication status is managed by the review workflow.</p></div>
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
          <td><div className="table-actions"><button type="button" className="button button-tertiary" onClick={() => setSelected(row)}>View details</button><button type="button" className="button button-tertiary" onClick={() => openEditor(row)}>Edit</button></div></td>
        </tr>)}</tbody></table></div>
        <div className="org-listing-cards">{visible.map((row, index) => <ListingCard key={row.id || `${row.title || 'listing'}-${index}`} row={row} onView={setSelected} onEdit={openEditor} />)}</div>
      </> : rows.length ? <EmptyState title="No listings match your filters">Adjust your search or status filter, or clear the filters to see all listings.</EmptyState> : <EmptyState title="No procurement listings yet" action={<Link className="button button-primary" to="/org/procurements/new">Create procurement</Link>}>Your organization’s opportunities will appear here when listing services are connected.</EmptyState>}
    </section>
    {selected && <Modal title={selected.title || 'Procurement details'} description="Information available in this procurement record." onClose={() => setSelected(null)}>
      <div className="detail-grid"><Detail label="Reference" value={selected.referenceNumber} /><Detail label="Type" value={selected.type && humanize(selected.type)} /><Detail label="Category" value={selected.category} /><Detail label="Status" value={selected.status && humanize(selected.status)} /><Detail label="Location" value={selected.location} /><Detail label="Estimated value" value={selected.estimatedValue != null ? String(selected.estimatedValue) : null} /><Detail label="Submission deadline" value={formatDate(selected.submissionDeadline)} /><Detail label="Created" value={formatDate(selected.createdAt)} /></div>
      <div className="dialog-actions"><button type="button" className="button button-secondary" onClick={() => setSelected(null)}>Close</button><button type="button" className="button button-secondary" disabled title="Status changes are not connected">Publish or close</button></div>
    </Modal>}
    {editing && <Modal title="Edit procurement" description={`${editing.referenceNumber || 'Procurement listing'} · ${humanize(editing.status || '')}`} onClose={() => { if (!saving) setEditing(null); }}>
      <form className="form-stack" onSubmit={saveListing}>
        {saveError && <ErrorState error={saveError} />}
        <Field label="Procurement title"><input name="title" required maxLength="180" defaultValue={editing.title || ''} /></Field>
        <Field label="Category"><input name="category" required maxLength="100" defaultValue={editing.category || ''} /></Field>
        <Field label="Description"><textarea name="description" rows="4" required maxLength="10000" defaultValue={editing.description || ''} /></Field>
        <div className="form-grid">
          <Field label="Estimated value (₹)"><input name="estimatedValue" type="number" min="0" step="any" defaultValue={editing.estimatedValue ?? ''} /></Field>
          <Field label="Location"><input name="location" maxLength="160" defaultValue={editing.location || ''} /></Field>
          <Field label="Submission deadline"><input name="submissionDeadline" type="datetime-local" required defaultValue={toDateTimeLocal(editing.submissionDeadline)} /></Field>
          <Field label="Minimum turnover (₹ lakhs)"><input name="minTurnover" type="number" min="0" step="any" defaultValue={editing.minTurnover == null ? '' : Number(editing.minTurnover) / 100000} /></Field>
          <Field label="Minimum experience (years)"><input name="minExperienceYears" type="number" min="0" step="1" defaultValue={editing.minExperienceYears ?? ''} /></Field>
          <Field label="Required documents"><textarea name="requiredDocuments" rows="4" defaultValue={Array.isArray(editing.requiredDocuments) ? editing.requiredDocuments.join('\n') : ''} /></Field>
        </div>
        <p className="supporting-copy">This updates the listing details only. Review status and document uploads are managed separately.</p>
        <div className="dialog-actions"><button type="button" className="button button-secondary" disabled={saving} onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div>
      </form>
    </Modal>}
  </>;
}

function ListingCard({ row, onView, onEdit }) {
  return <article className="org-listing-card">
    <div className="org-listing-card-heading"><div><h3>{row.title || 'Untitled procurement'}</h3><p>{row.category || row.referenceNumber || 'Procurement listing'}</p></div>{row.status && <StatusBadge status={row.status} />}</div>
    <dl className="org-listing-card-details"><div><dt>Created</dt><dd>{formatDate(row.createdAt)}</dd></div><div><dt>Deadline</dt><dd>{formatDate(row.submissionDeadline)}</dd></div></dl>
    <div className="org-listing-card-actions"><button type="button" className="button button-secondary" onClick={() => onView(row)}>View details</button><button type="button" className="button button-tertiary" onClick={() => onEdit(row)}>Edit</button></div>
  </article>;
}

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function Detail({ label, value }) {
  return <div className="detail-item"><dt>{label}</dt><dd>{value || '—'}</dd></div>;
}
