'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { Brand } from './ui';

const CLIENT_MENU = [
  { icon: '⌂', label: 'Dashboard', href: '/client/dashboard' },
  { icon: '♧', label: 'Notifications', href: '/client/review-changes', notification: true },
  { icon: '♡', label: 'My wedding request', href: '/client/dashboard#client-request' },
  { icon: '+', label: 'Plan a new wedding', href: '/client/apply' },
  { icon: '▤', label: 'Previous weddings', href: '/client/dashboard#client-history' },
  { icon: '?', label: 'Help & support', soon: true },
];
const STAFF_MENU = [
  { icon: '⌂', label: 'Dashboard', href: '/staff/dashboard' },
  { icon: '✦', label: 'Vacancies', href: '/staff/vacancies' },
  { icon: '♧', label: 'Hiring updates', href: '/staff/vacancies#updates', notification: true },
  { icon: '♙', label: 'Complete staff profile', href: '/staff/apply' },
  { icon: '▤', label: 'My application', href: '/staff/dashboard#staff-application' },
  { icon: '✉', label: 'Joining letter', soon: true },
  { icon: '?', label: 'Help & support', soon: true },
];

export default function ProfileBar({ user, current }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hasNotification, setHasNotification] = useState(false);
  const other = current === 'client' ? 'staff' : 'client';
  const otherProfile = user[other];
  const firstName = (user[current]?.name || user.email || 'Guest').split(/[\s@]/)[0];
  const menu = current === 'client' ? CLIENT_MENU : STAFF_MENU;

  useEffect(() => { window.localStorage.setItem('wedding-last-space', current); }, [current]);

  useEffect(() => {
    if (current === 'staff') {
      let active = true;
      api('/staff/vacancies/mine').then((result) => { if (active) setHasNotification(result.unreadCount > 0); }).catch(() => {});
      const clearNotifications = () => setHasNotification(false);
      window.addEventListener('staff-notifications-read', clearNotifications);
      return () => { active = false; window.removeEventListener('staff-notifications-read', clearNotifications); };
    }
    let active = true;
    api('/client/request').then((result) => {
      if (active) setHasNotification(Boolean(result.request?.pendingRevision?.changes?.length));
    }).catch(() => {});
    return () => { active = false; };
  }, [current]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', closeOnEscape); document.body.style.overflow = ''; };
  }, [open]);

  async function logout() { await api('/auth/logout', { method: 'POST' }).catch(() => {}); router.replace('/'); }

  return <>
    <header className="dashboard-head">
      <div className="dashboard-head-inner">
        <Brand />
        <span className="dashboard-role">{current === 'client' ? 'CLIENT SPACE' : 'STAFF SPACE'}</span>
        <button className="menu-trigger" type="button" onClick={() => setOpen(true)} aria-label="Open navigation menu" aria-expanded={open} aria-controls="account-menu">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </div>
    </header>
    {open && <div className="menu-layer">
      <button className="menu-scrim" onClick={() => setOpen(false)} aria-label="Close menu" tabIndex={-1} />
      <aside className="account-menu" id="account-menu" aria-label={`${current} navigation`}>
        <div className="menu-top"><span className="menu-kicker">YOUR WORKSPACE</span><button className="menu-close" type="button" onClick={() => setOpen(false)} aria-label="Close navigation menu">×</button></div>
        <div className="menu-account"><span className="menu-avatar">{firstName.slice(0, 1).toUpperCase()}</span><span><strong>{user[current]?.name || 'Welcome'}</strong><small>{current === 'client' ? 'Client account' : 'Staff account'}</small></span></div>
        <nav className="menu-links">
          {menu.map((item) => item.soon
            ? <div className="menu-item menu-disabled" key={item.label} aria-disabled="true"><span className="menu-item-icon">{item.icon}</span><span>{item.label}</span><small>Coming soon</small></div>
            : <Link className={`menu-item ${pathname === item.href ? 'is-current' : ''}`} href={item.href} key={item.label} onClick={() => setOpen(false)}><span className="menu-item-icon">{item.icon}{item.notification && hasNotification && <i className="menu-notification-dot" aria-label="Unread notification" />}</span><span>{item.label}</span>{item.notification && hasNotification ? <small className="menu-notification-count">New</small> : <b aria-hidden="true">›</b>}</Link>)}
        </nav>
        <div className="menu-bottom">
          {otherProfile ? <Link className="menu-switch" href={`/${other}/dashboard`} onClick={() => setOpen(false)}>Switch to {other === 'client' ? 'Client' : 'Staff'} space <span>↗</span></Link> : <Link className="menu-switch" href={`/${other}/apply`} onClick={() => setOpen(false)}>{other === 'client' ? 'Create client profile' : 'Join as staff'} <span>↗</span></Link>}
          <button className="menu-logout" type="button" onClick={logout}><span aria-hidden="true">↪</span> Log out</button>
          <small className="menu-email">{user.email}</small>
        </div>
      </aside>
    </div>}
    {current === 'staff' && <nav className="staff-bottom-nav" aria-label="Staff navigation">
      <Link href="/staff/dashboard" aria-current={pathname === '/staff/dashboard' ? 'page' : undefined}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></svg><small>Home</small></Link>
      <Link href="/staff/vacancies" aria-current={pathname === '/staff/vacancies' ? 'page' : undefined}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12h18m-12 0v2h6v-2"/></svg><small>Vacancies</small></Link>
      <Link href="/staff/vacancies#updates"><span className="staff-tab-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4"/></svg>{hasNotification && <i />}</span><small>Updates</small></Link>
      <Link href="/staff/apply" aria-current={pathname === '/staff/apply' ? 'page' : undefined}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg><small>Profile</small></Link>
    </nav>}
  </>;
}
