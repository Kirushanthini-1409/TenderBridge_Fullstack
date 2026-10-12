import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import DeadlineCountdown from '../../components/dashboard/DeadlineCountdown.jsx';
import { EmptyState, ErrorState, Field, FilterBar, LoadingState, PageHeader, SearchField } from '../../components/common/ProcurementUI.jsx';
import { explainError } from '../../services/api.js';
import { tenderService } from '../../services/tenderService.js';
import { formatDate, getRows } from '../../utils/formatters.js';

/**
 * TenderListing
 * Member 2 — Core Intelligence & Analysis Engine
 *
 * Browseable list of tender opportunities.  Calls GET /api/v1/tenders with
 * optional search, category, and deadline-range query parameters.
 *
 * The backend GET /api/v1/tenders endpoint is defined in backend/src/app.js
 * and accepts: search, category, deadlineFrom, deadlineTo, page, pageSize.
 * Response shape: { items: Tender[], pagination: { page, pageSize, total?, totalPages? } }
 *
 * When the API is unavailable (e.g. backend not running), the ErrorState component
 * shows an integration-pending notice rather than a generic crash.
 */

function formatCurrency(value) {
  if (value === null || value === undefined) return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

export default function TenderListing() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state — applied on form submit, not on keystroke
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [deadlineFrom, setDeadlineFrom] = useState('');
  const [deadlineTo, setDeadlineTo] = useState('');
  const [page, setPage] = useState(1);

  // Derive category suggestions from already-loaded rows for the datalist
  const knownCategories = useMemo(
    () => [...new Set(rows.map(r => r.category).filter(Boolean))].sort(),
    [rows],
  );

  async function load(nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: nextPage,
        pageSize: 20,
        ...(query.trim() ? { search: query.trim() } : {}),
        ...(category.trim() ? { category: category.trim() } : {}),
        ...(deadlineFrom ? { deadlineFrom } : {}),
        ...(deadlineTo ? { deadlineTo } : {}),
      };
      const data = await tenderService.list(params);
      setRows(getRows(data));
      setPagination(data?.pagination ?? { page: nextPage, pageSize: 20 });
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }

  // Load on mount and whenever the page number changes
  useEffect(() => { load(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(event) {
    event.preventDefault();
    setPage(1);
    load(1);
  }

  function clearFilters() {
    setQuery('');
    setCategory('');
    setDeadlineFrom('');
    setDeadlineTo('');
    setPage(1);
    // Use a timeout so state is cleared before load reads it
    setTimeout(() => load(1), 0);
  }

  const hasFilters = Boolean(query.trim() || category.trim() || deadlineFrom || deadlineTo);
  const canGoBack = pagination.page > 1;
  const canGoForward = pagination.totalPages
    ? pagination.page < pagination.totalPages
    : rows.length === pagination.pageSize;

  return <>
    <PageHeader
      eyebrow="BUSINESS WORKSPACE"
      title="Tender discovery"
      description="Browse government and private procurement opportunities in the shared catalogue."
      action={
        <button type="button" className="button button-secondary" onClick={() => load(page)} disabled={loading}>
          Refresh
        </button>
      }
    />

    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Available tenders</h2>
          <p>Search by title, reference number, category, or issuing authority.</p>
        </div>
        {hasFilters && (
          <button type="button" className="button button-secondary" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <FilterBar>
          <SearchField
            label="Search tenders"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Title, authority, or reference"
          />
          <Field label="Category">
            <input
              list="tender-categories-list"
              value={category}
              onChange={event => setCategory(event.target.value)}
              maxLength="100"
              placeholder="All categories"
            />
            <datalist id="tender-categories-list">
              {knownCategories.map(value => <option key={value} value={value} />)}
            </datalist>
          </Field>
          <Field label="Deadline from">
            <input
              type="date"
              value={deadlineFrom}
              onChange={event => setDeadlineFrom(event.target.value)}
            />
          </Field>
          <Field label="Deadline to">
            <input
              type="date"
              value={deadlineTo}
              onChange={event => setDeadlineTo(event.target.value)}
            />
          </Field>
          <Field label="Action">
            <button type="submit" className="button button-primary" disabled={loading}>
              Apply filters
            </button>
          </Field>
        </FilterBar>
      </form>

      {loading ? (
        <LoadingState label="Loading tenders…" />
      ) : error ? (
        <TenderUnavailable error={error} onRetry={() => load(page)} />
      ) : rows.length > 0 ? (
        <>
          <div className="opportunity-grid">
            {rows.map((tender, index) => (
              <TenderCard key={tender.id || tender.referenceNumber || `tender-${index}`} tender={tender} />
            ))}
          </div>

          {/* Pagination */}
          <div className="form-submit-bar">
            <span style={{ color: '#66788d', fontSize: '11px' }}>
              Page {pagination.page}
              {pagination.totalPages ? ` of ${pagination.totalPages}` : ''}
              {typeof pagination.total === 'number' ? ` · ${pagination.total} total` : ''}
            </span>
            <div className="button-row">
              <button
                type="button"
                className="button button-secondary"
                disabled={!canGoBack || loading}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="button button-secondary"
                disabled={!canGoForward || loading}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : hasFilters ? (
        <EmptyState icon={<SearchIcon />} title="No matching tenders">
          No tender records matched your filters. Try adjusting the search or clearing filters.
        </EmptyState>
      ) : (
        <EmptyState icon={<TenderIcon />} title="No tenders in the catalogue">
          The tender catalogue is empty. Tenders are added by the platform administrator.
        </EmptyState>
      )}
    </section>
  </>;
}

function TenderCard({ tender }) {
  const href = `/business/tenders/${encodeURIComponent(tender.id || tender.referenceNumber)}`;
  return (
    <article className="opportunity-card">
      <div className="opportunity-card-top">
        <span className="opportunity-category">{tender.category || 'Procurement'}</span>
        {tender.status && <StatusBadge status={tender.status} />}
      </div>
      <h3>{tender.title || 'Untitled tender'}</h3>
      <p className="opportunity-source">
        {tender.issuingAuthority || 'Issuing authority not provided'}
      </p>
      <dl className="opportunity-details">
        {tender.referenceNumber && (
          <div><dt>Reference</dt><dd>{tender.referenceNumber}</dd></div>
        )}
        <div>
          <dt>Deadline</dt>
          <dd>{formatDate(tender.submissionDeadline)}</dd>
        </div>
        <div>
          <dt>Time left</dt>
          <dd><DeadlineCountdown deadline={tender.submissionDeadline} /></dd>
        </div>
        <div>
          <dt>Est. value</dt>
          <dd>{formatCurrency(tender.estimatedValue)}</dd>
        </div>
      </dl>
      <div className="opportunity-actions">
        <Link className="button button-primary" to={href}>View details</Link>
        {tender.officialLink && (
          <a
            className="button button-secondary"
            href={tender.officialLink}
            target="_blank"
            rel="noreferrer"
          >
            Official link
          </a>
        )}
      </div>
    </article>
  );
}

function TenderUnavailable({ error, onRetry }) {
  return (
    <div className="saved-unavailable" role="status">
      <span className="empty-icon" aria-hidden="true"><TenderIcon /></span>
      <h3>Tender catalogue unavailable</h3>
      <p>We couldn't load the tender list. Please try again in a moment.</p>
      <button type="button" className="button button-secondary" onClick={onRetry}>Try again</button>
      <details className="integration-details">
        <summary>Integration details</summary>
        <p>{explainError(error)}</p>
      </details>
    </div>
  );
}

function TenderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6.5h16M4 12h16M4 17.5h10" />
      <path d="M7 4v5M12 9.5v5M17 15v5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}
