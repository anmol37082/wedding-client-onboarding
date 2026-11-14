'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';
import { Alert, Field, inputProps } from '../../../../components/ui';

export default function Settings() {
  const [s, setS] = useState(null); const [cur, setCur] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  useEffect(() => { api('/admin/settings').then(setS).catch(() => {}); }, []);
  async function change(e) {
    e.preventDefault(); setErr(''); setOk('');
    try { await api('/admin/auth/password', { method: 'PATCH', body: { currentPassword: cur, newPassword: pw } }); setOk('Password updated.'); setCur(''); setPw(''); }
    catch (x) { setErr(x.fields?.newPassword || x.message); }
  }
  return (
    <>
      <h1 style={{ fontSize: '2rem' }}>Settings</h1>
      <div className="card" style={{ maxWidth: 520, marginBottom: 20 }}>
        <h3>Legal text</h3>
        <p className="muted">Current terms version: <strong>{s?.termsVersion || '…'}</strong>. Edit the Terms, Privacy and consent wording in <code>config/legal.js</code> and change the version; each acceptance records the version.</p>
      </div>
      <form className="card" style={{ maxWidth: 520 }} onSubmit={change}>
        <h3>Change password</h3>
        <Alert>{err}</Alert><Alert kind="ok">{ok}</Alert>
        <Field label="Current password" id="cur"><input {...inputProps('cur')} type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required /></Field>
        <Field label="New password" id="pw" hint="At least 10 characters."><input {...inputProps('pw')} type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required minLength={10} /></Field>
        <button className="btn btn-primary">Update password</button>
      </form>
    </>
  );
}
