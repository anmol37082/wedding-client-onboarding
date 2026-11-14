'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, fmtDate } from '../../../../lib/api';
import { Alert, Empty, Loading, StatusBadge } from '../../../../components/ui';

const EMPTY = { title: '', description: '', city: '', location: '', employmentType: 'Event based', payText: '', eventDate: '', deadline: '', openings: '1' };
const NEXT = { Applied: ['Under Review', 'Rejected'], 'Under Review': ['Shortlisted', 'Rejected'], Shortlisted: ['Interview Scheduled', 'Rejected'], 'Interview Scheduled': ['Selected', 'Rejected'], Selected: [], Rejected: [] };
const localDateTime = (value) => { if (!value) return ''; const d = new Date(value); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export default function AdminVacancies() {
  const [vacancies, setVacancies] = useState(null); const [form, setForm] = useState(EMPTY); const [editId, setEditId] = useState(null);
  const [selected, setSelected] = useState(null); const [applications, setApplications] = useState([]); const [activeApp, setActiveApp] = useState(null);
  const [stageData, setStageData] = useState({ stage: '', interviewAt: '', interviewLocation: '', joiningDate: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { const result = await api('/admin/vacancies'); setVacancies(result.vacancies); setErr(''); } catch (e) { setErr(e.message); } }, []);
  useEffect(() => { load(); }, [load]);
  const set = (key) => (event) => setForm((x) => ({ ...x, [key]: event.target.value }));
  const setStage = (key) => (event) => setStageData((x) => ({ ...x, [key]: event.target.value }));

  function edit(vacancy) {
    setEditId(vacancy.id || vacancy._id);
    setForm({ title: vacancy.title, description: vacancy.description, city: vacancy.city, location: vacancy.location || '', employmentType: vacancy.employmentType, payText: vacancy.payText || '', eventDate: vacancy.eventDate ? new Date(vacancy.eventDate).toISOString().slice(0, 10) : '', deadline: localDateTime(vacancy.deadline), openings: String(vacancy.openings) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function saveVacancy(event) {
    event.preventDefault(); setBusy(true); setErr('');
    try {
      const body = { ...form, openings: Number(form.openings), deadline: new Date(form.deadline).toISOString(), eventDate: form.eventDate ? new Date(`${form.eventDate}T12:00:00`).toISOString() : null };
      await api(editId ? `/admin/vacancies/${editId}` : '/admin/vacancies', { method: editId ? 'PUT' : 'POST', body });
      setForm(EMPTY); setEditId(null); await load();
    } catch (e) { setErr(e.fields ? Object.values(e.fields).join(' ') : e.message); }
    setBusy(false);
  }
  async function setStatus(vacancy, status) {
    setBusy(true); setErr('');
    try { await api(`/admin/vacancies/${vacancy.id || vacancy._id}/status`, { method: 'PATCH', body: { status } }); await load(); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  }
  async function viewApplications(vacancy) {
    setSelected(vacancy); setErr('');
    try { const result = await api(`/admin/vacancies/${vacancy.id || vacancy._id}/applications`); setSelected(result.vacancy); setApplications(result.applications); }
    catch (e) { setErr(e.message); }
  }
  function chooseApplication(app) { setActiveApp(app); setStageData({ stage: NEXT[app.stage]?.[0] || app.stage, interviewAt: localDateTime(app.interviewAt), interviewLocation: app.interviewLocation || '', joiningDate: app.joiningDate ? new Date(app.joiningDate).toISOString().slice(0, 10) : '' }); }
  async function updateApplication(event) {
    event.preventDefault(); if (!activeApp) return; setBusy(true); setErr('');
    try {
      await api(`/admin/vacancy-applications/${activeApp.id}/stage`, { method: 'PATCH', body: { ...stageData, interviewAt: stageData.interviewAt ? new Date(stageData.interviewAt).toISOString() : '', joiningDate: stageData.joiningDate ? new Date(`${stageData.joiningDate}T12:00:00`).toISOString() : '' } });
      setActiveApp(null); await viewApplications(selected); await load();
    } catch (e) { setErr(e.fields ? Object.values(e.fields).join(' ') : e.message); }
    setBusy(false);
  }

  return <>
    <p className="dashboard-eyebrow">HIRING</p><h1>Vacancies</h1>
    <p className="small muted">Create a role, review candidates and move each application through the hiring stages.</p>
    {err && <Alert>{err}</Alert>}
    <form className="card vacancy-admin-form" onSubmit={saveVacancy}>
      <div className="vacancy-admin-form-head"><div><span>{editId ? 'EDIT ROLE' : 'NEW ROLE'}</span><h2>{editId ? 'Update vacancy' : 'Add a vacancy'}</h2></div>{editId && <button type="button" className="btn btn-sm" onClick={() => { setEditId(null); setForm(EMPTY); }}>Cancel</button>}</div>
      <div className="vacancy-admin-fields">
        <label>Role title<input value={form.title} onChange={set('title')} maxLength={100} required placeholder="e.g. Event service staff" /></label>
        <label>City<input value={form.city} onChange={set('city')} maxLength={80} required placeholder="City" /></label>
        <label className="wide">Role description<textarea value={form.description} onChange={set('description')} maxLength={3000} required minLength={10} placeholder="Responsibilities, requirements and shift details" /></label>
        <label>Venue / area<input value={form.location} onChange={set('location')} maxLength={160} placeholder="Optional" /></label>
        <label>Employment type<input value={form.employmentType} onChange={set('employmentType')} maxLength={50} required /></label>
        <label>Pay / compensation<input value={form.payText} onChange={set('payText')} maxLength={120} placeholder="Optional, e.g. ₹1,200 per shift" /></label>
        <label>Event date<input type="date" value={form.eventDate} onChange={set('eventDate')} /></label>
        <label>Application deadline<input type="datetime-local" value={form.deadline} onChange={set('deadline')} required /></label>
        <label>Number of staff needed<input type="number" value={form.openings} onChange={set('openings')} min="1" max="500" required /></label>
      </div>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : editId ? 'Save vacancy' : 'Publish vacancy'}</button>
    </form>

    <section className="vacancy-admin-list"><div className="vacancy-admin-list-head"><h2>All vacancies</h2><span>{vacancies?.length ?? '...'}</span></div>
      {!vacancies && !err ? <Loading /> : vacancies?.length ? <div className="vacancy-admin-cards">{vacancies.map((v) => <article className="vacancy-admin-card" key={v.id}>
        <div className="vacancy-admin-card-top"><span className="vacancy-tag">{v.employmentType}</span><StatusBadge status={v.status === 'open' ? 'Approved' : v.status === 'paused' ? 'In Review' : 'Completed'} /></div>
        <h3>{v.title}</h3><p>{v.city}{v.location ? ` · ${v.location}` : ''}</p>
        <div className="vacancy-admin-stats"><span><strong>{v.applicationCount}</strong> applicants</span><span><strong>{v.selectedCount}/{v.openings}</strong> selected</span><span><strong>{fmtDate(v.deadline)}</strong> deadline</span></div>
        {v.closedReason === 'filled' && <small className="vacancy-filled-note">Automatically closed: all positions filled</small>}{v.closedReason === 'deadline' && <small className="vacancy-filled-note">Closed after deadline</small>}
        <div className="vacancy-admin-actions"><button className="btn btn-sm btn-primary" onClick={() => viewApplications(v)}>Applications ({v.applicationCount})</button><button className="btn btn-sm" onClick={() => edit(v)}>Edit</button>{v.status === 'open' ? <><button className="btn btn-sm" onClick={() => setStatus(v, 'paused')} disabled={busy}>Pause</button><button className="btn btn-sm btn-danger" onClick={() => setStatus(v, 'closed')} disabled={busy}>Close</button></> : <button className="btn btn-sm" onClick={() => setStatus(v, 'open')} disabled={busy || v.closedReason === 'deadline' || v.closedReason === 'filled'}>Reopen</button>}</div>
      </article>)}</div> : <Empty>No vacancies yet. Add your first role above.</Empty>}
    </section>

    {selected && <div className="modal vacancy-applications-modal" role="dialog" aria-modal="true" aria-label="Vacancy applicants" onClick={(e) => { if (e.target === e.currentTarget) { setSelected(null); setActiveApp(null); } }}>
      <div className="modal-box"><div className="vacancy-modal-head"><div><span className="vacancy-tag">APPLICANTS</span><h2>{selected.title}</h2><p>{applications.length} application(s) · {selected.selectedCount}/{selected.openings} selected</p></div><button className="btn btn-sm" onClick={() => { setSelected(null); setActiveApp(null); }}>Close</button></div>
        {applications.length === 0 ? <Empty>No one has applied yet.</Empty> : applications.map((app) => <article className="vacancy-candidate" key={app.id}>
          <div className="vacancy-candidate-head"><div><strong>{app.name}</strong><small>{app.city} · {app.experienceYears} years experience</small></div><StatusBadge status={app.stage} /></div>
          <p className="vacancy-candidate-skills">{app.skills.join(' · ')}</p>
          <div className="vacancy-candidate-files"><a href={app.cv.url} target="_blank" rel="noreferrer">Open CV · {app.cv.fileName}</a><a href={app.photoUrl} target="_blank" rel="noreferrer">View photo</a><a href={app.signatureUrl} target="_blank" rel="noreferrer">View signature</a></div>
          {app.interviewAt && <p className="small muted">Interview: {fmtDate(app.interviewAt, true)} · {app.interviewLocation}</p>}{app.joiningDate && <p className="small muted">Joining: {fmtDate(app.joiningDate)}</p>}
          {NEXT[app.stage]?.length > 0 && <button className="btn btn-sm" onClick={() => chooseApplication(app)}>Update stage</button>}
          {activeApp?.id === app.id && <form className="vacancy-stage-form" onSubmit={updateApplication}>
            <label>Move to<select value={stageData.stage} onChange={setStage('stage')}>{NEXT[app.stage].map((stage) => <option key={stage}>{stage}</option>)}</select></label>
            {stageData.stage === 'Interview Scheduled' && <><label>Interview date &amp; time<input type="datetime-local" value={stageData.interviewAt} onChange={setStage('interviewAt')} required /></label><label>Interview location / meeting link<input value={stageData.interviewLocation} onChange={setStage('interviewLocation')} required /></label></>}
            {stageData.stage === 'Selected' && <label>Joining date<input type="date" value={stageData.joiningDate} onChange={setStage('joiningDate')} required /></label>}
            <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Saving...' : 'Save & notify applicant'}</button><button type="button" className="btn btn-sm" onClick={() => setActiveApp(null)}>Cancel</button>
          </form>}
        </article>)}
      </div>
    </div>}
  </>;
}
