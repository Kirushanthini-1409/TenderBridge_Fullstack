import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Login from './pages/public/Login.jsx';
import Register from './pages/public/Register.jsx';
import useAuth from './hooks/useAuth.js';
import ApplicationTracker from './pages/business/ApplicationTracker.jsx';
import SavedOpportunities from './pages/business/SavedOpportunities.jsx';
import JVPartnerDirectory from './pages/business/JVPartnerDirectory.jsx';
import OrgDashboard from './pages/private_org/OrgDashboard.jsx';
import CreateProcurement from './pages/private_org/CreateProcurement.jsx';
import ManageListings from './pages/private_org/ManageListings.jsx';
import VerificationRequests from './pages/admin/VerificationRequests.jsx';

export default function AppRoutes() {
  return <Routes>
    <Route path="/" element={<Navigate to="/business/applications" replace />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route element={<RequireAuth roles={['BUSINESS']} />}>
      <Route path="/business/applications" element={<ApplicationTracker />} />
      <Route path="/business/saved" element={<SavedOpportunities />} />
      <Route path="/business/partners" element={<JVPartnerDirectory />} />
    </Route>
    <Route element={<RequireAuth roles={['ORGANIZATION', 'ADMIN']} />}>
      <Route path="/org/dashboard" element={<OrgDashboard />} />
      <Route path="/org/procurements" element={<ManageListings />} />
      <Route path="/org/procurements/new" element={<CreateProcurement />} />
    </Route>
    <Route element={<RequireAuth roles={['ADMIN']} />}>
      <Route path="/admin/verification-requests" element={<VerificationRequests />} />
    </Route>
    <Route path="/admin/approvals" element={<Navigate to="/admin/verification-requests" replace />} />
    <Route path="*" element={<Navigate to="/business/applications" replace />} />
  </Routes>;
}

function RequireAuth({ roles }) {
  const { session, role, loading, configured } = useAuth();
  const location = useLocation();
  if (!configured) return <SetupRequired />;
  if (loading) return <p role="status">Checking your session…</p>;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!roles.includes(role)) return <AccessDenied role={role} />;
  return <Outlet />;
}

function SetupRequired() {
  return <section className="panel"><h2>Authentication setup needed</h2><p>Add your Supabase project URL and anon key to <code>frontend/.env.local</code>, then restart Vite.</p></section>;
}

function AccessDenied({ role }) {
  return <section className="panel"><h2>Workspace access isn’t assigned</h2><p>{role ? `Your account role is ${role}.` : 'Your account has no TenderBridge workspace role yet.'} Ask a TenderBridge administrator to assign the correct role in Supabase trusted app metadata, then sign in again.</p><Link className="button button-secondary" to="/login">Return to sign in</Link></section>;
}
