'use client';
import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import { useSession } from '../../lib/useSession';
import styles from './page.module.css';

function LoginForm() {
  const router = useRouter();
  const intent = useSearchParams().get('intent') || '';
  const validIntent = intent === 'client' || intent === 'staff';
  const { user, loading } = useSession({ require: false, intent: validIntent ? intent : '' });
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!validIntent) { router.replace('/'); return; }
    if (!loading && user) {
      if (intent === 'client') router.replace(user.client ? '/client/dashboard' : '/client/apply');
      else router.replace(user.staff ? '/staff/dashboard' : '/staff/apply');
    }
  }, [intent, loading, router, user, validIntent]);

  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const d = await api('/auth/send-otp', { method: 'POST', body: { email } });
      const q = new URLSearchParams({ email: d.email, intent, ...(d.devOtp ? { dev: d.devOtp } : {}) });
      router.push(`/verify-otp?${q}`);
    } catch (err) { setError(err.fields?.email || err.message); setBusy(false); }
  }

  if (!validIntent) return <main className={styles.screen}><p className={styles.loading}>Returning to experience selection…</p></main>;
  const label = intent === 'client' ? 'Client' : 'Staff / Jobs';
  return (
    <main className={styles.screen}>
      <section className={styles.content}>
        <Link href="/" className={styles.back} aria-label="Back to experience selection"><span aria-hidden="true">‹</span> Back</Link>
        <Image className={styles.logo} src="/icons/app-icon.svg" alt="Jashne Riyasat" width={52} height={52} priority />
        <p className={styles.brand}>Jashne Riyasat</p>
        <h1>{label} Login</h1>
        <p className={styles.intro}>Enter your email to receive a secure sign-in code.</p>
        <form className={styles.form} onSubmit={submit} noValidate>
          <label className={styles.label} htmlFor="email">Email address</label>
          <input className={styles.input} id="email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} required aria-invalid={Boolean(error)} />
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button className={styles.submit} disabled={busy || !email.trim()}>{busy ? 'Sending code…' : 'Continue'}</button>
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className={styles.screen}><p className={styles.loading}>Loading…</p></main>}><LoginForm /></Suspense>;
}
