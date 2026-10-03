import { useMemo, useState } from 'react';
import PartnerCompanyCard from '../../components/jv/PartnerCompanyCard.jsx';
import { EmptyState, ErrorState, Field, FilterBar, LoadingState, Modal, PageHeader, Panel, SearchField } from '../../components/common/ProcurementUI.jsx';
import { partnerDirectoryService } from '../../services/procurementService.js';
import { formatDate, getRows } from '../../utils/formatters.js';

export default function JVPartnerDirectory() {
  const [tenderId, setTenderId] = useState(''); const [rows, setRows] = useState([]); const [query, setQuery] = useState(''); const [capability, setCapability] = useState('ALL');
  const [loading, setLoading] = useState(false); const [searched, setSearched] = useState(false); const [error, setError] = useState(null); const [selected, setSelected] = useState(null); const [formOpen, setFormOpen] = useState(false); const [publishError, setPublishError] = useState(null); const [publishing, setPublishing] = useState(false);
  const capabilities = [...new Set(rows.flatMap(row => String(row.offeredCapabilities || '').split(/[,;\n]/).map(item => item.trim()).filter(Boolean)))].sort();
  const visible = useMemo(() => rows.filter(row => {
    const text = `${row.companyName || ''} ${row.offeredCapabilities || ''} ${row.contactPerson || ''}`.toLowerCase();
    return (!query.trim() || text.includes(query.trim().toLowerCase())) && (capability === 'ALL' || String(row.offeredCapabilities || '').toLowerCase().includes(capability.toLowerCase()));
  }), [rows, query, capability]);

  async function search(event) {
    event?.preventDefault(); if (!tenderId.trim()) return;
    setLoading(true); setError(null); setSearched(true);
    try { setRows(getRows(await partnerDirectoryService.listForTender(tenderId.trim()))); }
    catch (requestError) { setError(requestError); setRows([]); }
    finally { setLoading(false); }
  }

  async function publish(event) {
    event.preventDefault(); const form = event.currentTarget; const payload = Object.fromEntries(new FormData(form).entries());
    setPublishing(true); setPublishError(null);
    try { await partnerDirectoryService.publishForTender(tenderId.trim(), payload); setFormOpen(false); form.reset(); await search({ preventDefault() {} }); }
    catch (requestError) { setPublishError(requestError); }
    finally { setPublishing(false); }
  }

  return <>
    <PageHeader eyebrow="BUSINESS WORKSPACE" title="JV & Consortium Partners" description="Discover businesses offering capabilities that may complement your procurement requirements." action={<button type="button" className="button button-primary" disabled={!tenderId.trim()} onClick={() => setFormOpen(true)}>Express interest</button>} />
    <Panel title="Find partners for a tender" description="Partner listings are associated with an individual tender.">
      <form className="tender-search-form" onSubmit={search}><Field label="Tender ID"><input value={tenderId} onChange={event => setTenderId(event.target.value)} required placeholder="Enter a tender ID" /></Field><button className="button button-primary" disabled={loading}>{loading ? 'Searching…' : 'Find partners'}</button></form>
    </Panel>
    {error ? <Panel title="Partner directory"><ErrorState error={error} onRetry={search} /></Panel> : searched && <Panel title="Partner directory" description={`${visible.length} ${visible.length === 1 ? 'listing' : 'listings'} for this tender`}>
      {rows.length > 0 && <FilterBar><SearchField label="Search companies" value={query} onChange={event => setQuery(event.target.value)} placeholder="Company or capability" /><Field label="Capability"><select value={capability} onChange={event => setCapability(event.target.value)}><option value="ALL">All capabilities</option>{capabilities.map(value => <option key={value}>{value}</option>)}</select></Field></FilterBar>}
      {loading ? <LoadingState label="Loading partner listings…" /> : visible.length ? <div className="partner-grid">{visible.map(row => <PartnerCompanyCard key={row.id} partner={row} onView={setSelected} />)}</div> : rows.length ? <EmptyState title="No partners match those filters">Try a different company or capability search.</EmptyState> : <EmptyState title="No partner listings yet">No companies have listed interest in this tender.</EmptyState>}
    </Panel>}
    {!searched && <Panel title="Build a complementary bid team" description="Search by tender to find companies that have chosen to share their collaboration interest."><p className="supporting-copy">Partner records are shown only for the tender you search. Contact details appear only when a listing provides them.</p></Panel>}
    {formOpen && <Modal title="Express interest in a joint bid" description="The information you submit will be visible in this tender’s partner directory." onClose={() => setFormOpen(false)}><form className="form-stack" onSubmit={publish}>{publishError && <ErrorState error={publishError} />}<Field label="Company name"><input name="companyName" required /></Field><Field label="Capabilities offered"><textarea name="offeredCapabilities" rows="4" required /></Field><Field label="Contact person"><input name="contactPerson" required /></Field><Field label="Contact email"><input name="contactEmail" type="email" required /></Field><Field label="Contact phone"><input name="contactPhone" type="tel" /></Field><div className="dialog-actions"><button type="button" className="button button-secondary" onClick={() => setFormOpen(false)}>Cancel</button><button className="button button-primary" disabled={publishing}>{publishing ? 'Submitting…' : 'Submit interest'}</button></div></form></Modal>}
    {selected && <Modal title={selected.companyName || 'Company profile'} description="Partner listing for the selected tender." onClose={() => setSelected(null)}><div className="profile-summary"><div><span className="profile-label">Capabilities offered</span><p>{selected.offeredCapabilities || 'No capabilities supplied.'}</p></div><div><span className="profile-label">Contact person</span><p>{selected.contactPerson || 'Not provided'}</p></div><div><span className="profile-label">Listed</span><p>{formatDate(selected.createdAt)}</p></div><div><span className="profile-label">Contact details</span><p>{selected.contactEmail || selected.contactPhone || 'Not provided'}</p></div></div><div className="dialog-actions"><button className="button button-secondary" onClick={() => setSelected(null)}>Close</button>{selected.contactEmail && <a className="button button-primary" href={`mailto:${selected.contactEmail}`}>Contact company</a>}</div></Modal>}
  </>;
}
