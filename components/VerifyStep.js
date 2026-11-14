'use client';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import CameraCapture from './CameraCapture';
import SignaturePad from './SignaturePad';
import { Alert } from './ui';

// Step 2 for both Client and Staff: terms, confirmation, live photo and signature.
export default function VerifyStep({ onBack, onSubmit }) {
  const [legal, setLegal] = useState(null);
  const [terms, setTerms] = useState(false); const [age, setAge] = useState(false);
  const [photo, setPhoto] = useState(null); const [sig, setSig] = useState(null);
  const [errors, setErrors] = useState({}); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState({}); // reuse uploads when a retry happens

  useEffect(() => { api('/legal').then(setLegal).catch((e) => setMsg(e.message)); }, []);

  async function submit(e) {
    e.preventDefault(); setMsg('');
    const er = {};
    if (!terms) er.termsAccepted = 'Please accept the Terms & Conditions.';
    if (!age) er.ageConfirmed = 'Please confirm the information and age criteria.';
    if (!photo) er.photo = 'Take and confirm a live photo.';
    if (!sig) er.signature = 'Draw and save your signature.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const up = { ...uploaded };
      if (up.photoSrc !== photo) { up.photoId = (await api('/media/upload', { method: 'POST', body: { kind: 'photo', image: photo } })).publicId; up.photoSrc = photo; setUploaded({ ...up }); }
      if (up.sigSrc !== sig) { up.sigId = (await api('/media/upload', { method: 'POST', body: { kind: 'signature', image: sig } })).publicId; up.sigSrc = sig; setUploaded({ ...up }); }
      await onSubmit({ termsAccepted: true, ageConfirmed: true, termsVersion: legal.termsVersion, photoPublicId: up.photoId, signaturePublicId: up.sigId });
    } catch (err) { setErrors(err.fields || {}); setMsg(err.message); setBusy(false); }
  }

  return (
    <form onSubmit={submit} noValidate className="card">
      <h2>Verification &amp; agreement</h2>
      <Alert>{msg}</Alert>
      <div className="section-title">Terms &amp; Conditions</div>
      <div className="terms" tabIndex={0} aria-label="Terms and conditions">{legal ? legal.terms.map((t, i) => <p key={i}>{t}</p>) : 'Loading…'}</div>
      <label className="check"><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} /><span>I agree to the Terms &amp; Conditions.</span></label>
      {errors.termsAccepted && <span className="err" role="alert">{errors.termsAccepted}</span>}
      <label className="check"><input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} /><span>I confirm that the information provided by me is accurate and that I meet the required age criteria.</span></label>
      {errors.ageConfirmed && <span className="err" role="alert">{errors.ageConfirmed}</span>}
      {legal && <p className="small muted">{legal.consent} See our <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</p>}
      <div className="section-title">Live photo</div>
      <CameraCapture value={photo} onChange={setPhoto} error={errors.photo} />
      <div className="section-title">Signature</div>
      <SignaturePad value={sig} onChange={setSig} error={errors.signature} />
      <div className="row" style={{ marginTop: 28, justifyContent: 'space-between' }}>
        <button type="button" className="btn" onClick={onBack} disabled={busy}>Back</button>
        <button type="submit" className="btn btn-primary" disabled={busy || !legal}>{busy ? 'Submitting…' : 'Submit application'}</button>
      </div>
    </form>
  );
}
