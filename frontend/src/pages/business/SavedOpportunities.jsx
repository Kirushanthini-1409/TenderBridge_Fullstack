import { useEffect, useMemo, useState } from 'react';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import { EmptyState, Field, FilterBar, LoadingState, PageHeader, SearchField } from '../../components/common/ProcurementUI.jsx';
import { explainError } from '../../services/api.js';
import { savedOpportunitiesService } from '../../services/procurementService.js';
import { formatDate, getRows, humanize } from '../../utils/formatters.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const deadlineFilters = [
  ['ALL', 'All deadlines'],
  ['NEXT_7_DAYS', 'Due in 7 days'],
  ['NEXT_30_DAYS', 'Due in 30 days'],
  ['PAST', 'Past deadline'],
  ['NONE', 'No deadline'],
];

const tenderFor = item => item.tender || item;
const categoryFor = tender => tender.category || tender.type || '';
const deadlineFor = tender => tender.submissionDeadline;
const savedTitleFor = tender => tender.title || 'Tender opportunity';
const deadlineTimestamp = value => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};
const safeTenderLink = value => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

export default function SavedOpportunities() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [deadline, setDeadline] = useState('ALL');
  const [sort, setSort] = useState('deadline');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRows(getRows(await savedOpportunitiesService.list()));
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const categories = [...new Set(rows.map(item => categoryFor(tenderFor(item))).filter(Boolean))].sort();
  const statuses = [...new Set(rows.map(item => tenderFor(item).status).filter(Boolean))].sort();
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const now = Date.now();
    return rows.filter(item => {
      const tender = tenderFor(item);
      const tenderCategory = categoryFor(tender);
      const source = tender.issuingAuthority || '';
      const reference = tender.referenceNumber || '';
      const searchable = `${savedTitleFor(tender)} ${source} ${reference} ${tenderCategory}`.toLowerCase();
      const rawDeadline = deadlineFor(tender);
      const timestamp = deadlineTimestamp(rawDeadline);
      const daysUntilDeadline = timestamp !== null ? Math.ceil((timestamp - now) / DAY_MS) : null;
      const matchesDeadline = deadline === 'ALL'
        || (deadline === 'NEXT_7_DAYS' && daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 7)
        || (deadline === 'NEXT_30_DAYS' && daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 30)
        || (deadline === 'PAST' && daysUntilDeadline !== null && daysUntilDeadline < 0)
        || (deadline === 'NONE' && timestamp === null);
      return (!needle || searchable.includes(needle))
        && (category === 'ALL' || tenderCategory === category)
        && (status === 'ALL' || tender.status === status)
        && matchesDeadline;
    }).sort((firstItem, secondItem) => {
      const first = tenderFor(firstItem);
      const second = tenderFor(secondItem);
      if (sort === 'value' && first.estimatedValue != null && second.estimatedValue != null) {
        return Number(second.estimatedValue) - Number(first.estimatedValue);
      }
      const firstDate = deadlineTimestamp(deadlineFor(first));
      const secondDate = deadlineTimestamp(deadlineFor(second));
      if (firstDate === null && secondDate === null) return 0;
      if (firstDate === null) return 1;
      if (secondDate === null) return -1;
      return sort === 'latest' ? secondDate - firstDate : firstDate - secondDate;
    });
  }, [rows, query, category, status, deadline, sort]);

  const hasActiveFilters = Boolean(query.trim()) || category !== 'ALL' || status !== 'ALL' || deadline !== 'ALL';

  function clearFilters() {
    setQuery('');
    setCategory('ALL');
    setStatus('ALL');
    setDeadline('ALL');
    setSort('deadline');
  }

  async function remove(tenderId) {
    setActionError(null);
    setRemovingId(tenderId);
    try {
      await savedOpportunitiesService.toggle(tenderId);
      await load();
    } catch (requestError) {
      setActionError(requestError);
    } finally {
      setRemovingId(null);
    }
  }

  return <>
    <PageHeader eyebrow="BUSINESS WORKSPACE" title="Saved opportunities" description="Keep tenders you’re considering together so you can revisit their details and deadlines." action={<button className="button button-secondary" onClick={load} disabled={loading}>Refresh</button>} />

    <section className="stat-grid stat-grid-two" aria-label="Saved opportunity summary">
      <StatCard label="Total saved" value={loading || error ? '—' : rows.length} detail="Opportunities in your shortlist" />
      <StatCard label="Categories" value={loading || error ? '—' : categories.length} detail="Represented in your shortlist" />
    </section>

    {actionError && <div className="saved-action-notice" role="alert">
      <div><strong>Your shortlist wasn’t changed</strong><p>The save service couldn’t complete this request.</p>
        <details><summary>Integration details</summary><p>{explainError(actionError)}</p></details>
      </div>
      <button type="button" className="button button-tertiary" onClick={() => setActionError(null)}>Dismiss</button>
    </div>}

    <section className="panel saved-opportunities-panel">
      <div className="panel-header">
        <div><h2>Your shortlist</h2><p>Review each tender’s source, category, and submission deadline.</p></div>
        {hasActiveFilters && <button type="button" className="button button-secondary" onClick={clearFilters}>Clear filters</button>}
      </div>

      <div className="saved-filter-layout"><FilterBar>
        <SearchField label="Search saved opportunities" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search title, source, or reference" />
        <Field label="Category"><select value={category} onChange={event => setCategory(event.target.value)}><option value="ALL">All categories</option>{categories.map(value => <option key={value} value={value}>{value}</option>)}</select></Field>
        <Field label="Status"><select value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">All statuses</option>{statuses.map(value => <option key={value} value={value}>{humanize(value)}</option>)}</select></Field>
        <Field label="Deadline"><select value={deadline} onChange={event => setDeadline(event.target.value)}>{deadlineFilters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        <Field label="Sort by"><select value={sort} onChange={event => setSort(event.target.value)}><option value="deadline">Nearest deadline</option><option value="latest">Latest deadline</option><option value="value">Estimated value</option></select></Field>
      </FilterBar></div>

      {loading ? <LoadingState label="Loading saved opportunities…" /> : error ? <SavedUnavailable error={error} onRetry={load} /> : visible.length ? <div className="opportunity-grid">
        {visible.map((item, index) => {
          const tender = tenderFor(item);
          const id = item.tenderId || tender.id;
          const title = savedTitleFor(tender);
          const tenderLink = safeTenderLink(tender.officialLink);
          return <article className="opportunity-card" key={item.id || id || `${title}-${index}`}>
            <div className="opportunity-card-top">
              <span className="saved-indicator"><BookmarkIcon />Saved</span>
              {tender.status && <StatusBadge status={tender.status} />}
            </div>
            <p className="opportunity-category">{categoryFor(tender) || 'Procurement opportunity'}</p>
            <h3>{title}</h3>
            <p className="opportunity-source">{tender.issuingAuthority || 'Source not provided'}</p>
            <dl className="opportunity-details">
              {tender.referenceNumber && <div><dt>Reference</dt><dd>{tender.referenceNumber}</dd></div>}
              <div><dt>Deadline</dt><dd>{formatDate(deadlineFor(tender))}</dd></div>
            </dl>
            <div className="opportunity-actions">
              {tenderLink
                ? <a className="button button-primary" href={tenderLink} target="_blank" rel="noreferrer">View tender notice</a>
                : <button type="button" className="button button-secondary" disabled title="A tender link has not been provided">View unavailable</button>}
              <button type="button" className="button button-tertiary" disabled={!id || removingId === id} onClick={() => remove(id)}>{removingId === id ? 'Removing…' : 'Remove saved'}</button>
            </div>
          </article>;
        })}
      </div> : rows.length ? <EmptyState icon={<SearchIcon />} title="No matching opportunities">No saved tenders match your search or filters. Adjust your criteria or clear filters to see your shortlist.</EmptyState> : <EmptyState icon={<BookmarkIcon />} title="No saved opportunities yet">When you bookmark a tender, it will appear here with its source and submission deadline.</EmptyState>}
    </section>
  </>;
}

function SavedUnavailable({ error, onRetry }) {
  return <div className="saved-unavailable" role="status">
    <span className="empty-icon" aria-hidden="true"><BookmarkIcon /></span>
    <h3>Saved opportunities are unavailable</h3>
    <p>We couldn’t load your shortlist. Please try again in a moment.</p>
    <button type="button" className="button button-secondary" onClick={onRetry}>Try again</button>
    <details className="integration-details"><summary>Integration details</summary><p>{explainError(error)}</p></details>
  </div>;
}

function BookmarkIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 4.75A1.75 1.75 0 0 1 8.25 3h7.5a1.75 1.75 0 0 1 1.75 1.75V21l-5.5-3.5L6.5 21V4.75Z" /></svg>;
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>;
}
