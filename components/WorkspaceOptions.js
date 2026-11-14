import Link from 'next/link';
import styles from './WorkspaceOptions.module.css';

function WorkspaceIcon({ kind }) {
  if (kind === 'client') {
    return <svg style={{ display: 'block', width: 38, height: 38 }} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>;
  }
  return <svg style={{ display: 'block', width: 38, height: 38 }} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2" /></svg>;
}

function Workspace({ href, kind, label }) {
  return (
    <Link href={href} className={styles.option} style={{ minWidth: 0, minHeight: 154, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 6px', border: '1px solid rgba(85,0,0,.08)', borderRadius: 24, background: '#FFFDF6', color: '#550000', textDecoration: 'none', boxShadow: '0 8px 22px rgba(44,36,27,.08)', WebkitTapHighlightColor: 'transparent' }} aria-label={`Continue to ${label}`}>
      <span className={`${styles.icon} ${kind === 'staff' ? styles.staffIcon : ''}`} style={{ width: 76, height: 76, flex: '0 0 76px', display: 'grid', placeItems: 'center', borderRadius: 23, background: kind === 'staff' ? '#F3EBDD' : '#F0E8DC', color: '#550000' }}>
        <WorkspaceIcon kind={kind} />
      </span>
      <span className={styles.label} style={{ color: '#550000', font: '600 clamp(.78rem, 3.4vw, 1rem)/1.2 Montserrat, Segoe UI, sans-serif', letterSpacing: '.005em' }}>{label}</span>
    </Link>
  );
}

export default function WorkspaceOptions() {
  return (
    <nav className={styles.options} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'clamp(10px, 3vw, 16px)', width: '100%' }} aria-label="Choose an app experience">
      <Workspace href="/login?intent=client" kind="client" label="Plan your wedding" />
      <Workspace href="/login?intent=staff" kind="staff" label="Join our event team" />
    </nav>
  );
}
