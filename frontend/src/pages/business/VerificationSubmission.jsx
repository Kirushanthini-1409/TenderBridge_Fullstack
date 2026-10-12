import { useState } from 'react';
import { ErrorState, Field, Notice, PageHeader, Panel } from '../../components/common/ProcurementUI.jsx';
import { verificationRequestService } from '../../services/procurementService.js';

export default function VerificationSubmission() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(null);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const optional = name => String(form.get(name) || '').trim() || null;
    const payload = {
      type: form.get('type'),
      organizationName: String(form.get('organizationName') || '').trim(),
      businessName: optional('businessName'),
      contactPerson: String(form.get('contactPerson') || '').trim(),
      email: String(form.get('email') || '').trim(),
      contactPhone: optional('contactPhone'),
      registrationNo: optional('registrationNo'),
      documents: [],
    };
    setBusy(true);
    setError(null);
    try {
      const response = await verificationRequestService.submit(payload);
      setSubmitted(response?.item || {});
    } catch (requestError) {
      setError(requestError);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <PageHeader eyebrow="VERIFICATION" title="Request verification" description="Submit your organization or business details for review." />
    {submitted ? <Panel title="Request submitted" description="Your verification details were sent to the review queue.">
      <Notice kind="success">Your request has been recorded with status “Pending”.{submitted.id ? ` Reference: ${submitted.id}` : ''}</Notice>
      <button type="button" className="button button-secondary" onClick={() => setSubmitted(null)}>Submit another request</button>
    </Panel> : <>
      <Notice>File uploads are not connected yet. Submit only if your process allows an initial request without documents; don’t paste private file links here.</Notice>
      {error && <ErrorState error={error} />}
      <form className="procurement-form" onSubmit={submit}>
        <Panel title="Organization details" description="Enter the legal name and the contact information for this verification request.">
          <div className="form-grid">
            <Field label="Request type"><select name="type" required defaultValue="BUSINESS"><option value="BUSINESS">Business</option><option value="ORGANIZATION">Organization</option></select></Field>
            <Field label="Legal organization name"><input name="organizationName" required maxLength="180" /></Field>
            <Field label="Business name (optional)"><input name="businessName" maxLength="180" /></Field>
            <Field label="Registration number (optional)"><input name="registrationNo" maxLength="100" /></Field>
          </div>
        </Panel>
        <Panel title="Primary contact" description="We’ll associate this contact with the verification request.">
          <div className="form-grid">
            <Field label="Contact person"><input name="contactPerson" required maxLength="180" autoComplete="name" /></Field>
            <Field label="Contact email"><input name="email" type="email" required maxLength="254" autoComplete="email" /></Field>
            <Field label="Contact phone (optional)"><input name="contactPhone" type="tel" maxLength="40" autoComplete="tel" /></Field>
          </div>
        </Panel>
        <div className="form-submit-bar"><span>Review your details before sending the request.</span><button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit for verification'}</button></div>
      </form>
    </>}
  </>;
}
