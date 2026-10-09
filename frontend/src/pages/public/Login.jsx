import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Field, PageHeader, Panel } from '../../components/common/ProcurementUI.jsx';
import useAuth from '../../hooks/useAuth.js';

export default function Login() {
  const { signIn, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const destination = location.state?.from || '/business/applications';

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await signIn(String(form.get('email')).trim(), String(form.get('password')));
      navigate(destination, { replace: true });
    } catch (signInError) {
      setError(signInError.message || 'Could not sign in. Check your details and try again.');
    } finally {
      setBusy(false);
    }
  }

  return <>
    <PageHeader eyebrow="TENDERBRIDGE ACCOUNT" title="Sign in" description="Sign in with your Supabase account to access your TenderBridge workspace." />
    <Panel title="Welcome back" description="Use the email and password associated with your account.">
      {!configured && <p className="integration-notice" role="status">Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env.local`, then restart Vite.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <form className="form-stack" onSubmit={submit}>
        <Field label="Email"><input name="email" type="email" autoComplete="email" required disabled={!configured || busy} /></Field>
        <Field label="Password"><input name="password" type="password" autoComplete="current-password" required disabled={!configured || busy} /></Field>
        <button className="button button-primary" disabled={!configured || busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="auth-switch">New to TenderBridge? <Link to="/register">Create an account</Link></p>
    </Panel>
  </>;
}
