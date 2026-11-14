'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { Brand, Loading, Alert } from '../../../components/ui';

const NAV = [['/admin', 'Dashboard'], ['/admin/clients', 'Clients'], ['/admin/staff', 'Staff'], ['/admin/applications', 'Applications'], ['/admin/vacancies', 'Vacancies'], ['/admin/job-positions', 'Job Positions'], ['/admin/documents', 'Documents'], ['/admin/settings', 'Settings']];

export default function PanelLayout({ children }) {
  const router = useRouter(); const path = usePathname();
  const [admin, setAdmin] = useState(null); const [err, setErr] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { api('/admin/auth/me').then(setAdmin).catch((e) => (e.status === 401 ? router.replace('/admin/login') : setErr(e.message))); }, [router]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => { if (event.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', close); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', close); document.body.style.overflow = ''; };
  }, [menuOpen]);
  if (err) return <main className="narrow"><Alert>{err}</Alert></main>;
  if (!admin) return <Loading />;
  async function logout() { await api('/admin/auth/logout', { method: 'POST' }).catch(() => {}); router.replace('/admin/login'); }
  return (
    <div className="admin">
      <header className="admin-mobile-head"><div className="admin-mobile-head-inner"><Brand href="/admin" /><span>ADMIN SPACE</span><button className="admin-menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Open admin menu" aria-expanded={menuOpen}><i></i><i></i><i></i></button></div></header>
      <aside className="side">
        <div style={{ marginBottom: 12, color: '#fff' }}><Brand href="/admin" /></div>
        <nav aria-label="Admin">{NAV.map(([href, label]) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>{label}</Link>)}</nav>
        <button className="btn btn-sm" style={{ marginTop: 16, color: '#fff', borderColor: 'rgba(255,255,255,.5)' }} onClick={logout}>Sign out ({admin.username})</button>
      </aside>
      <main className="main admin-main">{children}</main>
      <nav className="admin-bottom-nav" aria-label="Main admin navigation">
        {NAV.slice(0, 4).map(([href, label], i) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}><span aria-hidden="true">{['⌂', '♡', '♙', '▤'][i]}</span><small>{label}</small></Link>)}
        <button type="button" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen}><span aria-hidden="true">•••</span><small>More</small></button>
      </nav>
      {menuOpen && <div className="admin-menu-layer"><button className="admin-menu-scrim" onClick={() => setMenuOpen(false)} aria-label="Close admin menu" /><section className="admin-menu-sheet" aria-label="More admin options"><div className="admin-menu-sheet-head"><div><small>ADMIN MENU</small><strong>{admin.username}</strong></div><button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button></div><nav>{NAV.slice(4).map(([href, label]) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined} onClick={() => setMenuOpen(false)}><span aria-hidden="true">{label === 'Job Positions' ? '✦' : label === 'Documents' ? '▧' : '⚙'}</span>{label}<b>›</b></Link>)}</nav><button className="admin-mobile-logout" onClick={logout}>Sign out</button></section></div>}
    </div>
  );
}
