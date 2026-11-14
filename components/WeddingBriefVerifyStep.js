'use client';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import SignaturePad from './SignaturePad';
import { Alert } from './ui';

export default function WeddingBriefVerifyStep({ onBack, onSubmit }) {
  const [legal, setLegal] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState(null);

  useEffect(() => { api('/legal').then(setLegal).catch((e) => setError(e.message)); }, []);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!accepted || !signature) {
      setError('Review the notice, confirm the details and add your signature.');
      return;
    }
    setBusy(true);
    try {
      let publicId = uploaded?.image === signature ? uploaded.publicId : null;
      if (!publicId) {
        const upload = await api('/media/upload', { method: 'POST', body: { kind: 'signature', image: signature } });
        publicId = upload.publicId;
        setUploaded({ image: signature, publicId });
      }
      await onSubmit({ termsAccepted: true, termsVersion: legal.weddingBriefVersion, signaturePublicId: publicId });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="card">
      <h2>Review and sign your wedding brief</h2>
      <p className="muted">This records your event request and proposed scope for Jashne Riyasat to review.</p>
      <div className="terms" tabIndex={0} aria-label="Wedding brief notice">
        {legal ? legal.weddingBriefNotice.map((line, index) => <p key={index}>{line}</p>) : 'Loading…'}
      </div>
      <label className="check">
        <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
        <span>I confirm these details reflect my current request and understand this is not a final booking confirmation or completed services contract.</span>
      </label>
      <div className="section-title">Client signature</div>
      <SignaturePad value={signature} onChange={setSignature} error={error && !signature ? error : ''} />
      {error && <Alert>{error}</Alert>}
      <div className="row" style={{ marginTop: 28, justifyContent: 'space-between' }}>
        <button type="button" className="btn" onClick={onBack} disabled={busy}>Back</button>
        <button type="submit" className="btn btn-primary" disabled={busy || !legal || !accepted || !signature}>
          {busy ? 'Submitting…' : 'Submit wedding request'}
        </button>
      </div>
    </form>
  );
}
