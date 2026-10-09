import { Navigate, Route, Routes } from 'react-router-dom';
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
    <Route path="/business/applications" element={<ApplicationTracker />} />
    <Route path="/business/saved" element={<SavedOpportunities />} />
    <Route path="/business/partners" element={<JVPartnerDirectory />} />
    <Route path="/org/dashboard" element={<OrgDashboard />} />
    <Route path="/org/procurements" element={<ManageListings />} />
    <Route path="/org/procurements/new" element={<CreateProcurement />} />
    <Route path="/admin/verification-requests" element={<VerificationRequests />} />
    <Route path="/admin/approvals" element={<Navigate to="/admin/verification-requests" replace />} />
    <Route path="*" element={<Navigate to="/business/applications" replace />} />
  </Routes>;
}
