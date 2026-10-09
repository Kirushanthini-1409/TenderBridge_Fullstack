import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';

const groups = [
  { title: 'Business', roles: ['BUSINESS'], links: [['/business/applications', 'Applications'], ['/business/saved', 'Saved opportunities'], ['/business/partners', 'JV partners']] },
  { title: 'Organization', roles: ['ORGANIZATION', 'ADMIN'], links: [['/org/dashboard', 'Overview'], ['/org/procurements', 'Manage listings'], ['/org/procurements/new', 'Create procurement']] },
  { title: 'Administration', roles: ['ADMIN'], links: [['/admin/verification-requests', 'Approvals']] },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [authError, setAuthError] = useState('');
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const visibleGroups = groups.filter(group => group.roles.includes(role));

  async function handleSignOut() {
    setAuthError('');
    try {
      await signOut();
      setOpen(false);
      navigate('/login', { replace: true });
    } catch (error) {
      setAuthError(error.message || 'Could not sign out.');
    }
  }

  return <header className="site-header"><a className="skip-link" href="#main-content">Skip to content</a><Link className="brand" to="/business/applications" aria-label="TenderBridge home"><span className="brand-mark" aria-hidden="true">TB</span><span>TenderBridge</span></Link>
    <button className="menu-toggle" aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(value => !value)}>{open ? 'Close menu' : 'Menu'}</button>
    <nav id="primary-navigation" className={open ? 'primary-nav is-open' : 'primary-nav'} aria-label="Main navigation">
      {user ? <>
        {visibleGroups.map(group => <div className="nav-group" key={group.title}><span className="nav-group-label">{group.title}</span><div className="nav-group-links">{group.links.map(([to, label]) => <NavLink key={to} to={to} end onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{label}</NavLink>)}</div></div>)}
        <button type="button" className="nav-link nav-signout" onClick={handleSignOut}>Sign out</button>
      </> : <div className="nav-auth-links"><NavLink to="/login" onClick={() => setOpen(false)} className="nav-link">Sign in</NavLink><NavLink to="/register" onClick={() => setOpen(false)} className="button button-primary">Create account</NavLink></div>}
      {authError && <span className="nav-auth-error" role="alert">{authError}</span>}
    </nav>
  </header>;
}
