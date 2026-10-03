import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import ApplicationTracker from './pages/business/ApplicationTracker.jsx';
import SavedOpportunities from './pages/business/SavedOpportunities.jsx';
import JVPartnerDirectory from './pages/business/JVPartnerDirectory.jsx';
import OrgPortal from './pages/private_org/OrgPortal.jsx';
import AdminApprovals from './pages/admin/AdminApprovals.jsx';

const links = [
  ['/business/applications', 'Applications'],
  ['/business/saved', 'Saved tenders'],
  ['/business/partners', 'JV partners'],
  ['/org/procurements', 'Organization portal'],
  ['/admin/approvals', 'Admin approvals'],
];

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink className="brand" to="/business/applications"><span className="brand-mark">T</span><span>TenderBridge</span></NavLink>
        <nav className="module-nav" aria-label="Member 3 modules">
          {links.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{label}</NavLink>)}
        </nav>
        <span className="workspace-label">Member 3 workspace</span>
      </header>
      <main className="main-content">
        <Routes>
          <Route path="/business/applications" element={<ApplicationTracker />} />
          <Route path="/business/saved" element={<SavedOpportunities />} />
          <Route path="/business/partners" element={<JVPartnerDirectory />} />
          <Route path="/org/procurements" element={<OrgPortal />} />
          <Route path="/admin/approvals" element={<AdminApprovals />} />
          <Route path="*" element={<Navigate to="/business/applications" replace />} />
        </Routes>
      </main>
      <footer className="app-footer">TenderBridge <span>•</span> Procurement workspace</footer>
    </div>
  );
}
