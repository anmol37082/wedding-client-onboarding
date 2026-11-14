'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../lib/useSession';
import BrandHeading from '../components/BrandHeading';
import WorkspaceOptions from '../components/WorkspaceOptions';
import styles from './page.module.css';

export default function AppHome() {
  const router = useRouter();
  const { user, loading } = useSession({ require: false });
  useEffect(() => {
    if (!user) return;
    if (user.client && !user.staff) router.replace('/client/dashboard');
    else if (user.staff && !user.client) router.replace('/staff/dashboard');
    else {
      const lastSpace = window.localStorage.getItem('wedding-last-space');
      router.replace(lastSpace === 'staff' ? '/staff/dashboard' : '/client/dashboard');
    }
  }, [router, user]);

  if (loading || user) return <main className={styles.home} style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#FEFAE7' }}><p>{user ? 'Opening your workspace…' : 'Checking your session…'}</p></main>;
  return (
    <main className={styles.home} style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 'max(20px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))', background: '#FEFAE7' }}>
      <div className={styles.content} style={{ width: '100%', maxWidth: 880, textAlign: 'center', paddingBlock: 12 }}>
        <BrandHeading />
        <p className={styles.eyebrow}>WEDDING PLANNING &amp; EVENT MANAGEMENT · INDIA</p>
        <h2 className={styles.heroTitle}>A considered plan for every celebration.</h2>
        <p className={styles.heroCopy}>Share your wedding dates, functions, vision and priorities. Jashne Riyasat will review your brief and work with you on a clear scope, schedule and written proposal.</p>
        <div className={styles.features}>
          <article><strong>Thoughtful planning</strong><span>Vision, budget priorities, vendors and approvals.</span></article>
          <article><strong>Every function in view</strong><span>Dates, venues, guest estimates and event-day requirements.</span></article>
          <article><strong>Clear scope</strong><span>Included services, limits and responsibilities recorded for review.</span></article>
        </div>
        <p className={styles.welcome}>Choose where you would like to continue</p>
        <WorkspaceOptions />
        <p className={styles.disclaimer}>A submitted wedding brief is a request for review, not a confirmed booking or final services contract.</p>
      </div>
    </main>
  );
}
