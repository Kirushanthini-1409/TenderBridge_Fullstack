import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import { EmptyState, ErrorState, Field, FilterBar, LoadingState, PageHeader, SearchField } from '../../components/common/ProcurementUI.jsx';
import { savedOpportunitiesService } from '../../services/procurementService.js';
import { formatDate, getRows } from '../../utils/formatters.js';

export default function SavedOpportunities() {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null); const [query, setQuery] = useState(''); const [category, setCategory] = useState('ALL'); const [status, setStatus] = useState('ALL'); const [sort, setSort] = useState('deadline');
  async function load() { setLoading(true); setError(null); try { setRows(getRows(await savedOpportunitiesService.list())); } catch (requestError) { setError(requestError); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const categories = [...new Set(rows.map(row => (row.tender || row).category).filter(Boolean))].sort();
  const statuses = [...new Set(rows.map(row => (row.tender || row).status).filter(Boolean))].sort();
  const visible = useMemo(() => rows.filter(item => {
    const tender = item.tender || item;
    const searchText = `${tender.title || ''} ${tender.issuingAuthority || ''} ${tender.referenceNumber || ''} ${tender.category || ''}`.toLowerCase();
    return (!query || searchText.includes(query.trim().toLowerCase())) && (category === 'ALL' || tender.category === category) && (status === 'ALL' || tender.status === status);
  }).sort((a, b) => {
    const first = a.tender || a; const second = b.tender || b;
    if (sort === 'value' && first.estimatedValue != null && second.estimatedValue != null) return second.estimatedValue - first.estimatedValue;
    const aDate = first.submissionDeadline ? new Date(first.submissionDeadline).getTime() : Number.MAX_SAFE_INTEGER;
    const bDate = second.submissionDeadline ? new Date(second.submissionDeadline).getTime() : Number.MAX_SAFE_INTEGER;
    return sort === 'latest' ? bDate - aDate : aDate - bDate;
  }), [rows, query, category, status, sort]);

  async function remove(tenderId) {
    setActionError(null);
    try { await savedOpportunitiesService.toggle(tenderId); await load(); }
    catch (requestError) { setActionError(requestError); }
  }

  return <>
    <PageHeader eyebrow="BUSINESS WORKSPACE" title="Saved opportunities" description="Keep shortlisted procurement opportunities together while you evaluate the fit." />
    <section className="stat-grid stat-grid-three" aria-label="Saved opportunities summary"><StatCard label="Saved opportunities" value={loading || error ? '—' : rows.length} detail="In your shortlist" /><StatCard label="Open opportunities" value={loading || error ? '—' : rows.filter(item => ['ACTIVE', 'OPEN'].includes(String((item.tender || item).status || '').toUpperCase())).length} detail="Based on current tender status" /><StatCard label="Categories" value={loading || error ? '—' : categories.length} detail="Represented in your shortlist" /></section>
    {actionError && <ErrorState error={actionError} />}
    <section className="panel"><div className="panel-header"><div><h2>Your shortlist</h2><p>Compare deadlines and issuing organizations at a glance.</p></div></div>
      <FilterBar><SearchField label="Search saved opportunities" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search title, source, or reference" /><Field label="Category"><select value={category} onChange={event => setCategory(event.target.value)}><option value="ALL">All categories</option>{categories.map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Status"><select value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">All statuses</option>{statuses.map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Sort by"><select value={sort} onChange={event => setSort(event.target.value)}><option value="deadline">Nearest deadline</option><option value="latest">Latest deadline</option><option value="value">Estimated value</option></select></Field></FilterBar>
      {loading ? <LoadingState label="Loading saved opportunities…" /> : error ? <ErrorState error={error} onRetry={load} /> : visible.length ? <div className="opportunity-grid">{visible.map(item => { const tender = item.tender || item; const id = item.tenderId || tender.id; return <article className="opportunity-card" key={item.id || id}><div className="opportunity-card-top"><span className="saved-indicator" aria-label="Saved opportunity">Saved</span>{tender.status && <StatusBadge status={tender.status} />}</div><p className="opportunity-category">{tender.category || tender.type || 'Procurement opportunity'}</p><h3>{tender.title || 'Tender opportunity'}</h3><p className="opportunity-source">{tender.issuingAuthority || 'Source not provided'}</p><dl className="opportunity-details"><div><dt>Reference</dt><dd>{tender.referenceNumber || '—'}</dd></div><div><dt>Deadline</dt><dd>{formatDate(tender.submissionDeadline)}</dd></div>{tender.estimatedValue != null && <div><dt>Estimated value</dt><dd>{new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(tender.estimatedValue)}</dd></div>}</dl><div className="opportunity-actions">{tender.officialLink ? <a className="button button-primary" href={tender.officialLink} target="_blank" rel="noreferrer">View tender notice</a> : <button type="button" className="button button-secondary" disabled title="A tender link has not been provided">View tender</button>}<button type="button" className="button button-tertiary" disabled={!id} onClick={() => remove(id)}>Remove saved tender</button></div></article>; })}</div> : rows.length ? <EmptyState title="No matching opportunities">Change your search or filters to see more saved tenders.</EmptyState> : <EmptyState title="No saved opportunities yet" action={<Link className="button button-primary" to="/business/applications">View application tracker</Link>}>Save a tender while reviewing it to keep its deadline and source details close at hand.</EmptyState>}
    </section>
  </>;
}
