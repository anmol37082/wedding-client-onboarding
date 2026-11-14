'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { Field, inputProps, Alert, Brand } from '../../../components/ui';

export default function AdminLogin() {
  const router = useRouter();
  const [username, setU] = useState(''); const [password, setP] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api('/admin/auth/login', { method: 'POST', body: { username, password } }); router.replace('/admin'); }
    catch (x) { setErr(x.message); setBusy(false); }
  }
  return (
    <main className="narrow" style={{ padding: '72px 20px', maxWidth: 440 }}>
      <div style={{ marginBottom: 24 }}><Brand href="/admin/login" /></div>
      <form className="card" onSubmit={submit}>
        <h1 style={{ fontSize: '1.8rem' }}>Admin sign in</h1>
        <Alert>{err}</Alert>
        <Field label="Username" id="username"><input {...inputProps('username')} value={username} onChange={(e) => setU(e.target.value)} autoComplete="username" required autoFocus /></Field>
        <Field label="Password" id="password"><input {...inputProps('password')} type="password" value={password} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required /></Field>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
