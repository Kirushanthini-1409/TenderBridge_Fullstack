import { useEffect, useMemo, useState } from 'react';
import ApplicationTrackerTable from '../../components/dashboard/ApplicationTrackerTable.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import { EmptyState, ErrorState, Field, FilterBar, LoadingState, Modal, PageHeader, SearchField } from '../../components/common/ProcurementUI.jsx';
import { applicationsService } from '../../services/procurementService.js';
import { formatDate, getRows, humanize } from '../../utils/formatters.js';

const statuses = ['INTERESTED', 'SUBMITTED', 'UNDER_EVALUATION', 'RESULT_RELEASED', 'CLOSED'];
const deadlineOf = row => row.tender?.submissionDeadline || row.submissionDeadline;
const titleOf = row => row.tender?.title || row.tenderTitle || 'Tender';
const stageFor = status => ({ INTERESTED: 0, SUBMITTED: 1, UNDER_EVALUATION: 1, RESULT_RELEASED: 2, CLOSED: 2 }[status] ?? 0);

export default function ApplicationTracker() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sort, setSort] = useState('deadline');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  async function load() {
    setLoading(true); setError(null);
    try { setRows(getRows(await applicationsService.list())); } catch (requestError) { setError(requestError); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const categories = [...new Set(rows.map(row => row.tender?.category || row.category).filter(Boolean))].sort();
  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter(row => {
      const category = row.tender?.category || row.category || '';
      const source = row.tender?.issuingAuthority || row.issuingAuthority || '';
      const searchable = `${titleOf(row)} ${source} ${category} ${row.tender?.referenceNumber || row.referenceNumber || ''}`.toLowerCase();
      return (!needle || searchable.includes(needle)) && (statusFilter === 'ALL' || row.status === statusFilter) && (categoryFilter === 'ALL' || category === categoryFilter);
    }).sort((a, b) => {
      const first = sort === 'updated' ? a.updatedAt : deadlineOf(a);
      const second = sort === 'updated' ? b.updatedAt : deadlineOf(b);
      const firstTime = first ? new Date(first).getTime() : Number.MAX_SAFE_INTEGER;
      const secondTime = second ? new Date(second).getTime() : Number.MAX_SAFE_INTEGER;
      return sort === 'latest' ? secondTime - firstTime : firstTime - secondTime;
    });
  }, [rows, query, statusFilter, categoryFilter, sort]);

  const counts = {
    total: rows.length,
    interested: rows.filter(row => row.status === 'INTERESTED').length,
    submitted: rows.filter(row => ['SUBMITTED', 'UNDER_EVALUATION'].includes(row.status)).length,
    completed: rows.filter(row => ['RESULT_RELEASED', 'CLOSED'].includes(row.status)).length,
  };

  async function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = { ...editing, status: form.get('status'), notes: form.get('notes'), referenceNo: form.get('referenceNo'), submissionDate: form.get('submissionDate') || null };
    setSaving(true); setSaveError(null);
    try { await applicationsService.createOrUpdate(payload); setEditing(null); await load(); }
    catch (requestError) { setSaveError(requestError); }
    finally { setSaving(false); }
  }

  return <>
    <PageHeader eyebrow="BUSINESS WORKSPACE" title="Application tracker" description="Track each opportunity from first interest through submission and result." action={<button className="button button-secondary" onClick={load} disabled={loading}>Refresh</button>} />
    <section className="stat-grid" aria-label="Application summary"><StatCard label="Total applications" value={loading || error ? '—' : counts.total} detail="Tracked opportunities" /><StatCard label="Interested" value={loading || error ? '—' : counts.interested} detail="Considering a response" /><StatCard label="Submitted" value={loading || error ? '—' : counts.submitted} detail="Submitted or under evaluation" /><StatCard label="Completed / result" value={loading || error ? '—' : counts.completed} detail="Result released or closed" /></section>
    <section className="workflow-strip" aria-label="Application status progression"><span className="workflow-title">Application progression</span><ol className="workflow-steps"><li className="workflow-step">Interested</li><li className="workflow-connector" aria-hidden="true" /><li className="workflow-step">Submitted</li><li className="workflow-connector" aria-hidden="true" /><li className="workflow-step">Result</li></ol></section>
    <section className="panel">
      <div className="panel-header"><div><h2>Tracked applications</h2><p>Review deadlines, status, and recent updates.</p></div></div>
      <FilterBar>
        <SearchField label="Search applications" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search title, source, or reference" />
        <Field label="Status"><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="ALL">All statuses</option>{statuses.map(status => <option key={status} value={status}>{humanize(status)}</option>)}</select></Field>
        <Field label="Category"><select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option value="ALL">All categories</option>{categories.map(category => <option key={category}>{category}</option>)}</select></Field>
        <Field label="Sort by"><select value={sort} onChange={event => setSort(event.target.value)}><option value="deadline">Nearest deadline</option><option value="latest">Latest deadline</option><option value="updated">Last updated</option></select></Field>
      </FilterBar>
      {error ? <ErrorState error={error} onRetry={load} /> : loading ? <LoadingState label="Loading your applications…" /> : visibleRows.length ? <ApplicationTrackerTable rows={visibleRows} onSelect={setSelected} /> : rows.length ? <EmptyState title="No matching applications">Try another search or clear one or more filters.</EmptyState> : <EmptyState title="No applications tracked yet">Applications you decide to pursue will appear here.</EmptyState>}
    </section>
    {selected && <Modal title={titleOf(selected)} description="Application details and current progress." onClose={() => setSelected(null)}><div className="detail-grid"><Detail label="Status" value={humanize(selected.status)} /><Detail label="Source" value={selected.tender?.issuingAuthority || selected.issuingAuthority || '—'} /><Detail label="Category" value={selected.tender?.category || selected.category || '—'} /><Detail label="Deadline" value={formatDate(deadlineOf(selected))} /><Detail label="Submission reference" value={selected.referenceNo || '—'} /><Detail label="Last updated" value={formatDate(selected.updatedAt || selected.submissionDate)} /></div><ApplicationTimeline status={selected.status} /><div className="record-notes"><span>Notes</span><p>{selected.notes || 'No notes added.'}</p></div><div className="dialog-actions"><button className="button button-secondary" onClick={() => setSelected(null)}>Close</button><button className="button button-primary" onClick={() => { setEditing(selected); setSelected(null); setSaveError(null); }}>Update application</button></div></Modal>}
    {editing && <Modal title="Update application" description={titleOf(editing)} onClose={() => setEditing(null)}><form className="form-stack" onSubmit={save}>{saveError && <ErrorState error={saveError} />}<Field label="Application status"><select name="status" defaultValue={editing.status}>{statuses.map(status => <option key={status} value={status}>{humanize(status)}</option>)}</select></Field><Field label="Submission reference"><input name="referenceNo" defaultValue={editing.referenceNo || ''} /></Field><Field label="Submission date"><input type="date" name="submissionDate" defaultValue={editing.submissionDate?.slice(0, 10) || ''} /></Field><Field label="Notes"><textarea name="notes" rows="3" defaultValue={editing.notes || ''} /></Field><div className="dialog-actions"><button type="button" className="button button-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div></form></Modal>}
  </>;
}

function Detail({ label, value }) {
  return <div className="detail-item"><dt>{label}</dt><dd>{value || '—'}</dd></div>;
}

function ApplicationTimeline({ status }) {
  const active = stageFor(status);
  const stages = ['Interested', 'Submitted', 'Result'];
  return <ol className="detail-timeline" aria-label="Application progress">{stages.map((stage, index) => <li key={stage} className={index <= active ? 'complete' : ''} aria-current={index === active ? 'step' : undefined}><span className="timeline-marker" aria-hidden="true" /><span>{stage}</span><small>{index < active ? 'Complete' : index === active ? 'Current stage' : 'Not reached'}</small>{index === 1 && status === 'UNDER_EVALUATION' && <small>Under evaluation</small>}{index === 2 && status === 'CLOSED' && <small>Closed</small>}</li>)}</ol>;
}
