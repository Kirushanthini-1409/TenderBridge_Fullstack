import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, Field, Notice, PageHeader, Panel } from '../../components/common/ProcurementUI.jsx';
import { organizationProcurementService } from '../../services/procurementService.js';

export default function CreateProcurement() {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(null);
  async function submit(event) {
    event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const intent = event.nativeEvent.submitter?.value || 'publish';
    if (data.estimatedValue) data.estimatedValue = Number(data.estimatedValue);
    if (data.submissionDeadline) data.submissionDeadline = new Date(data.submissionDeadline).toISOString();
    data.requiredDocuments = data.requiredDocuments.split('\n').map(value => value.trim()).filter(Boolean);
    setBusy(true); setError(null);
    try { await organizationProcurementService.create({ ...data, intent }); }
    catch (requestError) { setError(requestError); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeader eyebrow="ORGANIZATION WORKSPACE" title="Create procurement" description="Prepare a structured opportunity for suppliers to review." action={<Link className="button button-secondary" to="/org/procurements">Back to listings</Link>} />
    <Notice>Publishing and draft saving are not connected yet. Your entries will remain on this form until a backend workflow is agreed.</Notice>
    {error && <ErrorState error={error} />}
    <form onSubmit={submit} className="procurement-form">
      <Panel title="Basic information" description="Give suppliers the core information they need to understand the opportunity."><div className="form-grid"><Field label="Procurement title"><input name="title" required maxLength="180" /></Field><Field label="Category"><input name="category" required maxLength="100" placeholder="Choose a procurement category" /></Field><Field label="Description" className="field-wide"><textarea name="description" rows="4" required /></Field></div></Panel>
      <Panel title="Procurement details" description="Set the estimated scale and submission window."><div className="form-grid"><Field label="Estimated value (₹)" hint="Optional. The API value convention still needs confirmation."><input name="estimatedValue" type="number" min="0" step="any" /></Field><Field label="Location"><input name="location" maxLength="160" /></Field><Field label="Submission deadline"><input name="submissionDeadline" type="datetime-local" required /></Field></div></Panel>
      <Panel title="Requirements" description="List the eligibility information and documents suppliers should prepare."><div className="form-grid"><Field label="Minimum turnover (₹ lakhs)"><input name="minTurnover" type="number" min="0" step="any" /></Field><Field label="Minimum experience (years)"><input name="minExperienceYears" type="number" min="0" step="1" /></Field><Field label="Required documents" className="field-wide" hint="Enter one document name per line."><textarea name="requiredDocuments" rows="4" /></Field></div></Panel>
      <Panel title="Attachments" description="Supporting document upload depends on the storage and publication contract."><p className="supporting-copy">File uploads are not available yet. No files will be sent or stored from this form.</p></Panel>
      <div className="form-submit-bar"><span>Review the opportunity details before submitting.</span><div className="button-row"><button type="submit" value="draft" className="button button-secondary" disabled={busy}>Save draft</button><button type="submit" value="publish" className="button button-primary" disabled={busy}>{busy ? 'Submitting…' : 'Publish opportunity'}</button></div></div>
    </form>
  </>;
}
