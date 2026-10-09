import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Field, PageHeader, Panel } from '../../components/common/ProcurementUI.jsx';
import useAuth from '../../hooks/useAuth.js';

export default function Register() {
  const { signUp, configured } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get('email')).trim();
    const password = String(form.get('password'));
    const confirmation = String(form.get('confirmPassword'));
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await signUp(email, password, String(form.get('fullName')).trim());
      setMessage(data.session
        ? 'Your account was created. Workspace access must be assigned by a TenderBridge administrator.'
        : 'Check your email to confirm your account. After confirmation, a TenderBridge administrator must assign your workspace role.');
      formElement.reset();
    } catch (signUpError) {
      setError(signUpError.message || 'Could not create the account. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return <>
    <PageHeader eyebrow="TENDERBRIDGE ACCOUNT" title="Create an account" description="Register using your organization email address." />
    <Panel title="Get started" description="After registration, an administrator must assign your workspace access.">
      {!configured && <p className="integration-notice" role="status">Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env.local`, then restart Vite.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="form-success" role="status">{message}</p>}
      <form className="form-stack" onSubmit={submit}>
        <Field label="Full name"><input name="fullName" autoComplete="name" maxLength="180" disabled={!configured || busy} /></Field>
        <Field label="Email"><input name="email" type="email" autoComplete="email" required disabled={!configured || busy} /></Field>
        <Field label="Password"><input name="password" type="password" autoComplete="new-password" minLength="8" required disabled={!configured || busy} /></Field>
        <Field label="Confirm password"><input name="confirmPassword" type="password" autoComplete="new-password" minLength="8" required disabled={!configured || busy} /></Field>
        <button className="button button-primary" disabled={!configured || busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p>
    </Panel>
  </>;
}
