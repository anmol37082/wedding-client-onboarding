'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, fmtDate } from '../../../lib/api';
import { useSession } from '../../../lib/useSession';
import { Alert, Loading } from '../../../components/ui';
import ProfileBar from '../../../components/ProfileBar';
import SignaturePad from '../../../components/SignaturePad';

export default function ReviewChangesPage() {
  const router = useRouter();
  const { user, loading, error } = useSession({ intent: 'client' });
  const [revision, setRevision] = useState(null);
  const [ready, setReady] = useState(false);
  const [signature, setSignature] = useState(null);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const proposal = revision?.fields?.planning;

  useEffect(() => {
    if (user) api('/client/request').then((result) => setRevision(result.request?.pendingRevision || null)).catch((e) => setErr(e.message)).finally(() => setReady(true));
  }, [user]);

  async function approve(e) {
    e.preventDefault(); setErr('');
    if (!agree || !signature) { setErr('Review the changes, agree, and add your signature to continue.'); return; }
    setBusy(true);
    try {
      const uploaded = await api('/media/upload', { method: 'POST', body: { kind: 'signature', image: signature } });
      const result = await api('/client/request/approve-changes', { method: 'POST', body: { agree: true, signaturePublicId: uploaded.publicId } });
      router.replace(`/document/${result.documentId}?action=print`);
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  if (loading || (user && !ready)) return <Loading text="Loading your update..." />;
  if (error) return <main className="narrow"><Alert>{error}</Alert></main>;
  if (!user) return null;

  return <>
    <ProfileBar user={user} current="client" />
    <main className="narrow revision-page">
      <a href="/client/dashboard" className="revision-back">‹ <span>Back to dashboard</span></a>
      {err && <Alert>{err}</Alert>}
      {!revision ? <section className="card revision-empty"><span className="revision-bell">✓</span><h1>All caught up</h1><p>There are no booking changes waiting for your review.</p><a className="btn btn-primary" href="/client/dashboard">Go to dashboard</a></section>
        : <>
          <header className="revision-intro"><span className="dashboard-eyebrow">BOOKING UPDATE</span><h1>Please review the changes</h1><p>The Jashne Riyasat team updated your booking details. Check each change before you approve it.</p><small>Sent {fmtDate(revision.proposedAt, true)}</small></header>
          <section className="card revision-list" aria-label="Changes proposed by the admin">
            <h2>What changed</h2>
            {revision.changes.map((change) => <article className="revision-change" key={change.key}>
              <h3>{change.label}</h3>
              <div className="revision-values"><div><small>BEFORE</small><p>{formatValue(change.before, change.key)}</p></div><span className="revision-arrow" aria-hidden="true">→</span><div><small>UPDATED TO</small><p>{formatValue(change.after, change.key)}</p></div></div>
            </article>)}
          </section>
          {proposal && <section className="card revision-list" aria-label="Proposed wedding terms">
            <h2>Proposed commercial terms</h2>
            <dl className="kv">
              <dt>Planner fee</dt><dd>{proposal.commercial?.planningFee ? `₹${proposal.commercial.planningFee}` : 'Not provided'}</dd>
              <dt>Tax treatment</dt><dd>{proposal.commercial?.taxTreatment || 'Not provided'}</dd>
              <dt>Cancellation</dt><dd>{proposal.commercial?.cancellation || 'Not provided'}</dd>
              <dt>Postponement</dt><dd>{proposal.commercial?.postponement || 'Not provided'}</dd>
              <dt>Overtime</dt><dd>{proposal.commercial?.overtime || 'Not provided'}</dd>
            </dl>
            <h3>Payment milestones</h3>
            <ul>{(proposal.commercial?.payments || []).map((payment, index) => <li key={`${payment.milestone}-${index}`}>{payment.milestone || 'Milestone'} — {payment.percentage}%{payment.amount ? ` · ₹${payment.amount}` : ''} · {payment.due || 'Due date not provided'}</li>)}</ul>
            <h3>Included services</h3>
            <ul>{(proposal.scope || []).map((item) => <li key={item.key}>{item.key}: {item.included === null ? 'Not selected' : item.included ? 'Included' : 'Not included'}{item.limits ? ` · ${item.limits}` : ''}</li>)}</ul>
          </section>}
          <form className="card revision-approval" onSubmit={approve}>
            <h2>Approve this update</h2>
            <p>By signing, you confirm the updated information is correct. A new signed document will be saved to your profile and shared with the admin team.</p>
            <label className="check revision-consent"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>I have reviewed and agree to the changes above.</span></label>
            <div className="section-title">Your signature</div>
            <SignaturePad value={signature} onChange={setSignature} />
            {err && <Alert>{err}</Alert>}
            <button className="btn btn-primary revision-submit" disabled={busy || !agree || !signature}>{busy ? 'Saving signed copy...' : 'Sign & approve changes'}</button>
          </form>
        </>}
    </main>
  </>;
}

function formatValue(value, key) {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (key === 'planning') return 'See the proposed commercial terms and service scope below.';
  if (key === 'weddingDate') return fmtDate(value);
  if (key === 'additionalRequirements') return value;
  return String(value);
}
