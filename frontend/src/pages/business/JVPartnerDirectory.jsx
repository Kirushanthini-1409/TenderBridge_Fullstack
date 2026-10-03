import { useMemo, useState } from 'react';
import PartnerCompanyCard from '../../components/jv/PartnerCompanyCard.jsx';
import { EmptyState, Field, FilterBar, LoadingState, Modal, PageHeader, Panel, SearchField } from '../../components/common/ProcurementUI.jsx';
import { explainError } from '../../services/api.js';
import { partnerDirectoryService } from '../../services/procurementService.js';
import { formatDate, getRows } from '../../utils/formatters.js';

const capabilitiesFor = partner => String(partner.offeredCapabilities || '')
  .split(/[,;\n]/)
  .map(item => item.trim())
  .filter(Boolean);

export default function JVPartnerDirectory() {
  const [tenderId, setTenderId] = useState('');
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [capability, setCapability] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [publishing, setPublishing] = useState(false);

  const capabilities = [...new Set(rows.flatMap(capabilitiesFor))]
    .sort((first, second) => first.localeCompare(second));
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter(partner => {
      const text = [
        partner.companyName,
        partner.offeredCapabilities,
        partner.contactPerson,
        partner.contactEmail,
        partner.contactPhone,
      ].filter(Boolean).join(' ').toLowerCase();
      const partnerCapabilities = capabilitiesFor(partner).map(value => value.toLowerCase());
      return (!needle || text.includes(needle))
        && (capability === 'ALL' || partnerCapabilities.includes(capability.toLowerCase()));
    });
  }, [rows, query, capability]);

  const hasActiveFilters = Boolean(query.trim()) || capability !== 'ALL';

  async function search(event) {
    event?.preventDefault();
    const requestedTenderId = tenderId.trim();
    if (!requestedTenderId || loading) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    setRows([]);
    setQuery('');
    setCapability('ALL');
    setSelected(null);
    try {
      setRows(getRows(await partnerDirectoryService.listForTender(requestedTenderId)));
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setQuery('');
    setCapability('ALL');
  }

  async function publish(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    setPublishing(true);
    setPublishError(null);
    try {
      await partnerDirectoryService.publishForTender(tenderId.trim(), payload);
      setFormOpen(false);
      form.reset();
      await search();
    } catch (requestError) {
      setPublishError(requestError);
    } finally {
      setPublishing(false);
    }
  }

  return <>
    <PageHeader eyebrow="BUSINESS WORKSPACE" title="JV & Consortium Partners" description="Find businesses whose capabilities could strengthen a joint tender response." action={<button type="button" className="button button-primary" disabled={!tenderId.trim()} onClick={() => { setPublishError(null); setFormOpen(true); }}>Express interest</button>} />

    <Panel title="Find partners for a tender" description="Enter a tender ID to view partner listings shared for that opportunity.">
      <form className="tender-search-form" onSubmit={search}>
        <Field label="Tender ID" hint="Use the identifier associated with the tender opportunity."><input value={tenderId} onChange={event => setTenderId(event.target.value)} required placeholder="Enter a tender ID" /></Field>
        <button className="button button-primary" disabled={loading || !tenderId.trim()}>{loading ? 'Searching…' : 'Find partners'}</button>
      </form>
    </Panel>

    {!searched ? <Panel title="Build a complementary bid team" description="Partner listings are associated with a specific tender.">
      <p className="supporting-copy">Search for a tender to see companies that have shared collaboration interest. Contact information appears only when the listing includes it.</p>
    </Panel> : <Panel title="Partner directory" description={error ? 'Partner information could not be loaded.' : `${visible.length} ${visible.length === 1 ? 'partner listing' : 'partner listings'} for this tender`} className="partner-directory-panel" action={hasActiveFilters && !error ? <button type="button" className="button button-secondary" onClick={clearFilters}>Clear filters</button> : null}>
      {rows.length > 0 && <div className="partner-filter-layout"><FilterBar>
        <SearchField label="Search partners" value={query} onChange={event => setQuery(event.target.value)} placeholder="Company, capability, or contact" />
        <Field label="Capability"><select value={capability} onChange={event => setCapability(event.target.value)}><option value="ALL">All capabilities</option>{capabilities.map(value => <option key={value} value={value}>{value}</option>)}</select></Field>
      </FilterBar></div>}
      {loading ? <LoadingState label="Loading partner listings…" /> : error ? <PartnerUnavailable error={error} onRetry={search} /> : visible.length ? <div className="partner-grid">
        {visible.map((partner, index) => <PartnerCompanyCard key={partner.id || `${partner.companyName || 'partner'}-${index}`} partner={partner} onView={setSelected} />)}
      </div> : rows.length ? <EmptyState icon={<SearchIcon />} title="No matching partners">No listings match your search or capability filter. Adjust your search or clear filters to see more.</EmptyState> : <EmptyState icon={<PartnerIcon />} title="No partner listings yet">No companies have shared collaboration interest for this tender.</EmptyState>}
    </Panel>}

    {formOpen && <Modal title="Express interest in a joint bid" description="Your company and contact details will be shared in this tender’s partner directory." onClose={() => setFormOpen(false)}>
      <form className="form-stack" onSubmit={publish}>
        {publishError && <PartnerActionNotice error={publishError} />}
        <Field label="Company name"><input name="companyName" autoComplete="organization" required /></Field>
        <Field label="Capabilities offered" hint="Describe the services or expertise your company can contribute."><textarea name="offeredCapabilities" rows="4" required /></Field>
        <Field label="Contact person"><input name="contactPerson" autoComplete="name" required /></Field>
        <Field label="Contact email"><input name="contactEmail" type="email" autoComplete="email" required /></Field>
        <Field label="Contact phone"><input name="contactPhone" type="tel" autoComplete="tel" /></Field>
        <div className="dialog-actions"><button type="button" className="button button-secondary" onClick={() => setFormOpen(false)}>Cancel</button><button className="button button-primary" disabled={publishing}>{publishing ? 'Submitting…' : 'Submit interest'}</button></div>
      </form>
    </Modal>}

    {selected && <Modal title={selected.companyName || 'Company profile'} description="Partner listing for the selected tender." onClose={() => setSelected(null)}>
      <div className="profile-summary">
        <div><span className="profile-label">Capabilities offered</span><p>{selected.offeredCapabilities || 'No capabilities supplied.'}</p></div>
        <div><span className="profile-label">Contact person</span><p>{selected.contactPerson || 'Not provided'}</p></div>
        <div><span className="profile-label">Listed</span><p>{formatDate(selected.createdAt)}</p></div>
        <div><span className="profile-label">Contact details</span><p>{selected.contactEmail || selected.contactPhone || 'Not provided'}</p></div>
      </div>
      <div className="dialog-actions"><button className="button button-secondary" onClick={() => setSelected(null)}>Close</button>{selected.contactEmail && <a className="button button-primary" href={`mailto:${selected.contactEmail}`}>Contact company</a>}</div>
    </Modal>}
  </>;
}

function PartnerUnavailable({ error, onRetry }) {
  return <div className="partner-unavailable" role="status">
    <span className="empty-icon" aria-hidden="true"><PartnerIcon /></span>
    <h3>Partner listings are unavailable</h3>
    <p>We couldn’t load the directory for this tender. Please try again in a moment.</p>
    <button type="button" className="button button-secondary" onClick={onRetry}>Try again</button>
    <details className="integration-details"><summary>Integration details</summary><p>{explainError(error)}</p></details>
  </div>;
}

function PartnerActionNotice({ error }) {
  return <div className="partner-action-notice" role="alert">
    <strong>Your listing wasn’t submitted</strong>
    <p>No partner listing was created. You can keep your details in this form while the service is unavailable.</p>
    <details className="integration-details"><summary>Integration details</summary><p>{explainError(error)}</p></details>
  </div>;
}

function PartnerIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.8 19a5.2 5.2 0 0 1 10.4 0M14 15a4.2 4.2 0 0 1 7.2 3.2"/></svg>;
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>;
}
