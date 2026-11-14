'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, fmtDate } from '../../../lib/api';
import { useSession } from '../../../lib/useSession';
import { Alert, Loading, StatusBadge } from '../../../components/ui';
import ProfileBar from '../../../components/ProfileBar';

export default function StaffVacanciesPage() {
  const { user, loading, error } = useSession({ intent: 'staff' });
  const [openVacancies, setOpenVacancies] = useState([]);
  const [mine, setMine] = useState({ applications: [], notifications: [], unreadCount: 0 });
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try {
      const [open, applications] = await Promise.all([api('/staff/vacancies/open'), api('/staff/vacancies/mine')]);
      setOpenVacancies(open.vacancies); setMine(applications); setErr('');
    } catch (e) { setErr(e.message); }
    finally { setReady(true); }
  }, []);
  useEffect(() => { if (user?.staff) load(); }, [user, load]);

  async function readNotifications() {
    await api('/staff/vacancies/notifications/read', { method: 'PATCH', body: {} });
    await load();
  }

  if (loading || (user?.staff && !ready)) return <Loading text="Loading vacancies..." />;
  if (error) return <main className="narrow"><Alert>{error}</Alert></main>;
  if (!user) return null;

  return <>
    <ProfileBar user={user} current="staff" />
    <main className="wrap dashboard-main staff-vacancies-page">
      <p className="dashboard-eyebrow">STAFF SPACE</p><h1>Vacancies</h1>
      <p className="vacancy-page-intro">Find a role that fits you. Apply once and follow every update here.</p>
      {err && <Alert>{err}</Alert>}
      {!!mine.unreadCount && <section className="vacancy-updates" aria-label="New application updates"><div><span className="vacancy-update-dot">{mine.unreadCount}</span><div><strong>New hiring updates</strong><small>{mine.unreadCount} update(s) on your applications</small></div></div><button onClick={readNotifications}>View updates</button></section>}
      {mine.notifications.length > 0 && <section className="vacancy-notifications" id="updates"><div className="vacancy-section-head"><h2>Application updates</h2>{mine.unreadCount > 0 && <button onClick={readNotifications}>Mark read</button>}</div>{mine.notifications.slice(0, 5).map((notice) => <article className={notice.read ? 'vacancy-notice is-read' : 'vacancy-notice'} key={notice.id}><span aria-hidden="true">{notice.read ? '•' : '!'}</span><div><strong>{notice.title} · {notice.vacancy}</strong><p>{notice.message}</p><small>{fmtDate(notice.createdAt, true)}</small></div></article>)}</section>}
      {mine.applications.length > 0 && <section className="vacancy-section"><div className="vacancy-section-head"><h2>My applications</h2><span>{mine.applications.length}</span></div><div className="vacancy-cards">{mine.applications.map((application) => <article className="vacancy-card vacancy-applied-card" key={application._id}>
        <div className="vacancy-card-top"><span className="vacancy-tag">{application.vacancy?.employmentType || 'STAFF ROLE'}</span><StatusBadge status={application.stage} /></div>
        <h3>{application.vacancy?.title || 'Vacancy'}</h3><p className="vacancy-card-location">{application.vacancy?.city}{application.vacancy?.location ? ` · ${application.vacancy.location}` : ''}</p>
        <div className="vacancy-app-meta"><span>Applied {fmtDate(application.appliedAt)}</span>{application.interviewAt && <span>Interview {fmtDate(application.interviewAt, true)}</span>}{application.joiningDate && <span>Joining {fmtDate(application.joiningDate)}</span>}</div>
        {application.interviewLocation && <p className="vacancy-interview-location">Interview: {application.interviewLocation}</p>}
      </article>)}</div></section>}
      <section className="vacancy-section"><div className="vacancy-section-head"><h2>Open positions</h2><span>{openVacancies.length}</span></div>
        {openVacancies.length ? <div className="vacancy-cards">{openVacancies.map((vacancy) => <article className="vacancy-card" key={vacancy.id}>
          <div className="vacancy-card-top"><span className="vacancy-tag">{vacancy.employmentType}</span><span className="vacancy-open-pill">Hiring {vacancy.openings - vacancy.selectedCount}</span></div>
          <h3>{vacancy.title}</h3><p className="vacancy-card-location">{vacancy.city}{vacancy.location ? ` · ${vacancy.location}` : ''}</p>
          <p className="vacancy-description">{vacancy.description}</p>
          <div className="vacancy-app-meta"><span>Apply by {fmtDate(vacancy.deadline)}</span>{vacancy.eventDate && <span>Event {fmtDate(vacancy.eventDate)}</span>}{vacancy.payText && <span>{vacancy.payText}</span>}</div>
          <Link className="btn btn-primary vacancy-card-action" href={vacancy.alreadyApplied ? '/staff/vacancies#my-applications' : `/staff/vacancies/${vacancy.id}/apply`}>{vacancy.alreadyApplied ? `Applied · ${vacancy.stage}` : 'View role & apply'}</Link>
        </article>)}</div> : <div className="card vacancy-empty"><span aria-hidden="true">✦</span><strong>No open vacancies right now</strong><small>Check back soon. New positions will appear here.</small></div>}
      </section>
    </main>
  </>;
}
