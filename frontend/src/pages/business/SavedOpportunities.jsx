import { useEffect, useState } from 'react';
import { savedTendersService } from '../../services/member3Service.js';
import { EmptyState, ErrorText, Loading, PageHeading, Panel, StatusPill, formatDate, getRows, useAsyncAction } from '../../components/Member3UI.jsx';

export default function SavedOpportunities() {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null); const action = useAsyncAction();
  async function load() { setLoading(true); setError(null); try { setRows(getRows(await savedTendersService.list())); } catch (e) { setError(e); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function remove(id) { const result = await action.run(() => savedTendersService.toggle(id)); if (result !== undefined) await load(); }
  return <>
    <PageHeading eyebrow="BUSINESS WORKSPACE" title="Saved tenders" description="Keep promising opportunities close while you decide your next step." action={<button className="button button-secondary" onClick={load}>↻ Refresh</button>} />
    <Panel title="Your saved opportunities" note="Only you can see the tenders saved to your account.">
      {error && <ErrorText error={error} />}{action.error && <ErrorText error={action.error} />}
      {loading ? <Loading label="Loading saved tenders…" /> : rows.length === 0 ? <EmptyState icon="☆" title="No saved tenders yet">Save an opportunity while browsing tenders and it will be collected here.</EmptyState> : <div className="card-grid">{rows.map(item => { const tender = item.tender || item; const id = item.tenderId || tender.id; return <article className="tender-card" key={item.id || id}><div className="card-topline"><StatusPill tone="blue">{(tender.type || 'Opportunity').replaceAll('_', ' ')}</StatusPill><span className="muted">Saved {formatDate(item.savedAt)}</span></div><h3>{tender.title || 'Tender opportunity'}</h3><p className="muted">{tender.issuingAuthority || 'Issuing organization'}{tender.location ? ` · ${tender.location}` : ''}</p><div className="tender-meta"><span><small>Reference</small><b>{tender.referenceNumber || id}</b></span><span><small>Deadline</small><b>{formatDate(tender.submissionDeadline)}</b></span></div><button className="button button-secondary button-full" disabled={action.busy || !id} onClick={() => remove(id)}>Remove from saved</button></article>; })}</div>}
    </Panel>
  </>;
}
