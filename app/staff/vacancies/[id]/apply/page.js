'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../../../lib/api';
import { useSession } from '../../../../../lib/useSession';
import { Alert, Loading } from '../../../../../components/ui';
import ProfileBar from '../../../../../components/ProfileBar';
import CameraCapture from '../../../../../components/CameraCapture';
import SignaturePad from '../../../../../components/SignaturePad';

const readFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Could not read this file.')); reader.readAsDataURL(file);
});

export default function VacancyApplyPage({ params }) {
  const router = useRouter();
  const { user, loading, error } = useSession({ intent: 'staff' });
  const [vacancy, setVacancy] = useState(null);
  const [cv, setCv] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [signature, setSignature] = useState(null);
  const [agree, setAgree] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!user?.staff) return;
    api('/staff/vacancies/open').then((result) => setVacancy(result.vacancies.find((item) => String(item.id) === params.id) || null)).catch((e) => setErr(e.message)).finally(() => setReady(true));
  }, [user, params.id]);

  function chooseCv(event) {
    const file = event.target.files?.[0]; setErr('');
    if (!file) { setCv(null); return; }
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setCv(null); setErr('Choose a PDF, JPG or PNG CV up to 2 MB.'); event.target.value = ''; return;
    }
    setCv(file);
  }

  async function submit(event) {
    event.preventDefault(); setErr('');
    if (!cv || !photo || !signature || !agree) { setErr('Add your CV, photo and signature, then confirm the application.'); return; }
    setBusy(true);
    try {
      const cvUpload = await api('/media/upload', { method: 'POST', body: { kind: 'cv', image: await readFile(cv), mimeType: cv.type, fileName: cv.name } });
      const photoUpload = await api('/media/upload', { method: 'POST', body: { kind: 'photo', image: photo } });
      const signatureUpload = await api('/media/upload', { method: 'POST', body: { kind: 'signature', image: signature } });
      await api(`/staff/vacancies/${params.id}/apply`, { method: 'POST', body: { cvPublicId: cvUpload.publicId, cvResourceType: cvUpload.resourceType, fileName: cvUpload.fileName, mimeType: cvUpload.mimeType, photoPublicId: photoUpload.publicId, signaturePublicId: signatureUpload.publicId } });
      router.replace('/staff/dashboard?applied=1');
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  if (loading || (user && !ready)) return <Loading text="Loading vacancy..." />;
  if (error) return <main className="narrow"><Alert>{error}</Alert></main>;
  if (!user) return null;

  return <>
    <ProfileBar user={user} current="staff" />
    <main className="narrow vacancy-apply-page">
      {!vacancy ? <section className="card"><h1>Vacancy unavailable</h1><p>This position may have closed or passed its deadline.</p><a href="/staff/vacancies" className="btn">View vacancies</a></section> : <>
        <a href="/staff/vacancies" className="vacancy-back">‹ Back to vacancies</a>
        <header className="vacancy-apply-heading"><span className="dashboard-eyebrow">APPLICATION</span><h1>{vacancy.title}</h1><p>{vacancy.city}{vacancy.location ? ` · ${vacancy.location}` : ''}</p></header>
        <form className="card vacancy-apply-form" onSubmit={submit}>
          <div className="vacancy-form-section"><span>01</span><div><h2>Your CV</h2><p>PDF, JPG or PNG · Up to 2 MB</p></div></div>
          <label className="cv-upload"><span aria-hidden="true">↑</span><strong>{cv ? cv.name : 'Choose a CV file'}</strong><small>{cv ? `${(cv.size / 1024).toFixed(0)} KB · Ready to upload` : 'Tap to browse your files'}</small><input type="file" accept="application/pdf,image/png,image/jpeg" onChange={chooseCv} /></label>
          <div className="vacancy-form-section"><span>02</span><div><h2>Verification photo</h2><p>Take a clear photo so the hiring team can identify you.</p></div></div>
          <CameraCapture value={photo} onChange={setPhoto} />
          <div className="vacancy-form-section"><span>03</span><div><h2>Your signature</h2><p>Sign to confirm this application is yours.</p></div></div>
          <SignaturePad value={signature} onChange={setSignature} />
          <label className="check vacancy-confirm"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>I confirm my application details are accurate and agree to be contacted about this role.</span></label>
          {err && <Alert>{err}</Alert>}
          <button className="btn btn-primary vacancy-submit" disabled={busy || !cv || !photo || !signature || !agree}>{busy ? 'Submitting application...' : 'Submit application'}</button>
        </form>
      </>}
    </main>
  </>;
}
