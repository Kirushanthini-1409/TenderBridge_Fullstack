import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

const groups = [
  { title: 'Business', links: [['/business/applications', 'Applications'], ['/business/saved', 'Saved opportunities'], ['/business/partners', 'JV partners']] },
  { title: 'Organization', links: [['/org/dashboard', 'Overview'], ['/org/procurements', 'Manage listings'], ['/org/procurements/new', 'Create procurement']] },
  { title: 'Administration', links: [['/admin/verification-requests', 'Approvals']] },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  return <header className="site-header"><a className="skip-link" href="#main-content">Skip to content</a><Link className="brand" to="/business/applications" aria-label="TenderBridge home"><span className="brand-mark" aria-hidden="true">TB</span><span>TenderBridge</span></Link>
    <button className="menu-toggle" aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(value => !value)}>{open ? 'Close menu' : 'Menu'}</button>
    <nav id="primary-navigation" className={open ? 'primary-nav is-open' : 'primary-nav'} aria-label="Main navigation">{groups.map(group => <div className="nav-group" key={group.title}><span className="nav-group-label">{group.title}</span>{group.links.map(([to, label]) => <NavLink key={to} to={to} end onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{label}</NavLink>)}</div>)}</nav>
  </header>;
}
