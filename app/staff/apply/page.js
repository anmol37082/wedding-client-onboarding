'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { useSession } from '../../../lib/useSession';
import { Header, Field, inputProps, Alert, Loading, Stepper } from '../../../components/ui';
import VerifyStep from '../../../components/VerifyStep';
import DocumentStep from '../../../components/DocumentStep';

const EMPTY = { fullName: '', mobile: '', dob: '', email: '', address: '', city: '', education: '', experienceYears: '0', experienceDetails: '', positionId: '' };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ageOf = (dob) => { const d = new Date(dob), n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };

export default function StaffApply() {
  const router = useRouter();
  const { user, loading, error: sessionError } = useSession({ intent: 'staff' });
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY); const [skills, setSkills] = useState([]); const [skillText, setSkillText] = useState('');
  const [positions, setPositions] = useState([]); const [opts, setOpts] = useState({ educationLevels: [], skillSuggestions: [] });
  const [ready, setReady] = useState(false); const [errors, setErrors] = useState({}); const [msg, setMsg] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false);
  const [documentId, setDocumentId] = useState(null);

  useEffect(() => {
    if (!user) return;
    if (user.staff?.employeeAuthorized) { router.replace('/staff/dashboard'); return; }
    (async () => {
      try {
        const [p, o] = await Promise.all([api('/job-positions'), api('/options')]);
        setPositions(p.positions); setOpts(o);
        const next = { ...EMPTY };
        next.mobile = user.mobile || '';
        next.email = user.email || '';
        if (user.staff) {
          const { profile } = await api('/staff/profile');
          Object.keys(EMPTY).forEach((k) => { if (profile[k] !== undefined && profile[k] !== null && profile[k] !== '') next[k] = String(profile[k]); });
          next.dob = profile.dob ? profile.dob.slice(0, 10) : ''; setSkills(profile.skills || []);
          const { application } = await api('/staff/application');
          if (application?.position) next.positionId = application.position;
        }
        setForm(next);
      } catch (e) { setMsg(e.message); } finally { setReady(true); }
    })();
  }, [user]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggle = (s) => setSkills((l) => (l.includes(s) ? l.filter((x) => x !== s) : [...l, s].slice(0, 15)));
  const addSkills = () => { const add = skillText.split(',').map((s) => s.trim()).filter(Boolean); setSkills((l) => [...new Set([...l, ...add])].slice(0, 15)); setSkillText(''); };
  const profileBody = (draft) => ({ ...form, skills, experienceYears: Number(form.experienceYears), draft });

  function validate() {
    const e = {};
    if (form.fullName.trim().length < 2) e.fullName = 'Full name is required.';
    if (!/^(?:\+?91)?[6-9]\d{9}$/.test(form.mobile.replace(/[\s-]/g, ''))) e.mobile = 'Enter a valid 10-digit Indian mobile number.';
    if (!form.dob) e.dob = 'Date of birth is required.'; else if (ageOf(form.dob) < 18) e.dob = 'You must be at least 18 years old.';
    if (form.email.trim() && !EMAIL.test(form.email.trim())) e.email = 'Enter a valid email address.';
    if (form.address.trim().length < 5) e.address = 'Address is required.';
    if (form.city.trim().length < 2) e.city = 'City is required.';
    if (!form.education) e.education = 'Select your education.';
    if (!skills.length) e.skills = 'Add at least one skill.';
    if (!form.positionId) e.position = 'Select a job position.';
    return e;
  }
  async function save(draft) {
    await api('/staff/profile', { method: user.staff ? 'PUT' : 'POST', body: profileBody(draft) });
    user.staff = user.staff || { name: form.fullName };
    await api('/staff/application', { method: 'POST', body: { positionId: form.positionId } });
  }
  async function next(e) {
    e.preventDefault(); setMsg(''); setOk('');
    const er = validate(); setErrors(er);
    if (Object.keys(er).length) { document.getElementById(Object.keys(er)[0] === 'position' ? 'positionId' : Object.keys(er)[0])?.focus(); return; }
    setBusy(true);
    try { await save(false); setStep(2); window.scrollTo(0, 0); } catch (err) { setErrors(err.fields || {}); setMsg(err.message); }
    setBusy(false);
  }
  async function saveProgress() {
    setMsg(''); setOk(''); setBusy(true);
    try { await save(true); setOk('Progress saved. You can continue later.'); } catch (err) { setMsg(err.message); }
    setBusy(false);
  }
  async function submitAll(consent) {
    const d = await api('/staff/application/submit', { method: 'POST', body: { positionId: form.positionId, ...consent } });
    setDocumentId(d.documentId); setStep(3); window.scrollTo(0, 0);
  }

  if (loading || (user && !ready)) return <Loading text="Loading your application…" />;
  if (sessionError) return <main className="narrow"><Alert>{sessionError}</Alert></main>;
  if (!user) return null;

  return (
    <>
      <Header />
      <main className="narrow" style={{ padding: '32px 20px 64px', maxWidth: step === 3 ? 860 : 640 }}>
        <Stepper step={step} labels={['Your profile', 'Verification', 'Document']} />
        {step === 1 && (
          <form className="card" onSubmit={next} noValidate>
            <h2>Register as wedding staff</h2>
            <Alert>{msg}</Alert><Alert kind="ok">{ok}</Alert>
            <div className="section-title">Personal details</div>
            <Field label="Full name" id="fullName" error={errors.fullName}><input {...inputProps('fullName', errors.fullName)} value={form.fullName} onChange={set('fullName')} autoComplete="name" /></Field>
            <Field label="Mobile number" id="mobile" error={errors.mobile} hint="Contact number for your application."><input {...inputProps('mobile', errors.mobile)} type="tel" inputMode="numeric" autoComplete="tel-national" value={form.mobile} onChange={set('mobile')} /></Field>
            <Field label="Date of birth" id="dob" error={errors.dob} hint="You must be 18 or older."><input {...inputProps('dob', errors.dob)} type="date" max={new Date().toISOString().slice(0, 10)} value={form.dob} onChange={set('dob')} autoComplete="bday" /></Field>
            <Field label="Email (optional)" id="email" error={errors.email}><input {...inputProps('email', errors.email)} type="email" value={form.email} onChange={set('email')} autoComplete="email" /></Field>
            <Field label="Address" id="address" error={errors.address}><input {...inputProps('address', errors.address)} value={form.address} onChange={set('address')} autoComplete="street-address" /></Field>
            <Field label="City" id="city" error={errors.city}><input {...inputProps('city', errors.city)} value={form.city} onChange={set('city')} autoComplete="address-level2" /></Field>
            <div className="section-title">Professional details</div>
            <Field label="Job position" id="positionId" error={errors.position}>
              <select {...inputProps('positionId', errors.position)} value={form.positionId} onChange={set('positionId')}><option value="">Select a position</option>{positions.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></Field>
            <Field label="Education" id="education" error={errors.education}>
              <select {...inputProps('education', errors.education)} value={form.education} onChange={set('education')}><option value="">Select</option>{opts.educationLevels.map((l) => <option key={l}>{l}</option>)}</select></Field>
            <Field label="Skills" id="skills" error={errors.skills} hint="Tap to select, or type your own separated by commas.">
              <div className="chips" role="group" aria-label="Suggested skills">{[...new Set([...opts.skillSuggestions, ...skills])].map((s) => <button type="button" key={s} className="chip" aria-pressed={skills.includes(s)} onClick={() => toggle(s)}>{s}</button>)}</div>
              <div className="row" style={{ marginTop: 10, flexWrap: 'nowrap' }}>
                <input {...inputProps('skills', errors.skills)} value={skillText} onChange={(e) => setSkillText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkills(); } }} placeholder="Other skill" />
                <button type="button" className="btn" onClick={addSkills} disabled={!skillText.trim()}>Add</button>
              </div>
            </Field>
            <Field label="Years of experience" id="experienceYears" error={errors.experienceYears}><input {...inputProps('experienceYears', errors.experienceYears)} type="number" inputMode="numeric" min="0" max="60" value={form.experienceYears} onChange={set('experienceYears')} /></Field>
            <Field label="Experience details" id="experienceDetails" hint="Where you have worked and what you did. Optional."><textarea {...inputProps('experienceDetails')} value={form.experienceDetails} onChange={set('experienceDetails')} maxLength={1000} /></Field>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 24 }}>
              <button type="button" className="btn" onClick={saveProgress} disabled={busy}>Save progress</button>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Continue'}</button>
            </div>
          </form>)}
        {step === 2 && <VerifyStep onBack={() => setStep(1)} onSubmit={submitAll} />}
        {step === 3 && <DocumentStep documentId={documentId} onDone={() => router.push('/staff/dashboard')} />}
      </main>
    </>
  );
}
