'use client';
import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import styles from '../login/page.module.css';
import otpStyles from './page.module.css';

function Verify() {
  const router = useRouter(); const sp = useSearchParams();
  const email = sp.get('email') || ''; const intent = sp.get('intent') || ''; const dev = sp.get('dev');
  const validIntent = intent === 'client' || intent === 'staff';
  const [otp, setOtp] = useState(''); const [error, setError] = useState('');
  const [info, setInfo] = useState(dev ? `Development OTP: ${dev}` : '');
  const [busy, setBusy] = useState(false); const [resendBusy, setResendBusy] = useState(false);
  const [resendIn, setResendIn] = useState(30); const [expireIn, setExpireIn] = useState(300);

  useEffect(() => {
    const t = setInterval(() => { setResendIn((s) => Math.max(0, s - 1)); setExpireIn((s) => Math.max(0, s - 1)); }, 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (!email || !validIntent) router.replace('/'); }, [email, router, validIntent]);

  async function verify(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const user = await api('/auth/verify-otp', { method: 'POST', body: { email, otp, context: intent } });
      const hasExperience = intent === 'client' ? Boolean(user.client) : Boolean(user.staff);
      router.replace(hasExperience ? `/${intent}/dashboard` : `/${intent}/apply`);
    } catch (err) { setError(err.fields?.otp || err.message); setBusy(false); }
  }
  async function resend() {
    setError(''); setInfo(''); setResendBusy(true);
    try {
      const d = await api('/auth/send-otp', { method: 'POST', body: { email } });
      setResendIn(d.resendInSec); setExpireIn(d.expiresInSec); setOtp(''); setInfo(d.devOtp ? `Development OTP: ${d.devOtp}` : 'A new code has been sent.');
    } catch (err) { setError(err.message); }
    finally { setResendBusy(false); }
  }

  if (!email || !validIntent) return <main className={styles.screen}><p className={styles.loading}>Returning to experience selection…</p></main>;
  const label = intent === 'client' ? 'Client' : 'Staff / Jobs';
  return (
    <main className={styles.screen}>
      <section className={styles.content}>
        <Link href={`/login?intent=${intent}`} className={styles.back} aria-label="Back to login"><span aria-hidden="true">‹</span> Back</Link>
        <Image className={styles.logo} src="/icons/app-icon.svg" alt="Jashne Riyasat" width={52} height={52} priority />
        <p className={styles.brand}>Jashne Riyasat</p>
        <h1>{label} verification</h1>
        <p className={styles.intro}>Enter the 6-digit code sent to <strong className={otpStyles.email}>{email}</strong>. <Link href={`/login?intent=${intent}`} className={otpStyles.change}>Change</Link></p>
        <form className={otpStyles.form} onSubmit={verify} noValidate>
          <label className={styles.label} htmlFor="otp">Verification code</label>
          <input className={otpStyles.code} id="otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} required aria-label="6-digit verification code" aria-invalid={Boolean(error)} />
          <p className={otpStyles.timer} aria-live="polite">{expireIn > 0 ? `Code expires in ${Math.floor(expireIn / 60)}:${String(expireIn % 60).padStart(2, '0')}` : 'This code has expired. Request a new one.'}</p>
          {error && <p className={styles.error} role="alert">{error}</p>}
          {info && <p className={otpStyles.info} role="status">{info}</p>}
          <button className={styles.submit} disabled={busy || otp.length !== 6}>{busy ? 'Verifying…' : 'Verify code'}</button>
        </form>
        <div className={otpStyles.resend}>{resendIn > 0 ? <span>Resend code in {resendIn}s</span> : <button type="button" onClick={resend} disabled={resendBusy}>{resendBusy ? 'Sending…' : 'Resend code'}</button>}</div>
      </section>
    </main>
  );
}

export default function VerifyPage() {
  return <Suspense fallback={<main className={styles.screen}><p className={styles.loading}>Loading…</p></main>}><Verify /></Suspense>;
}
