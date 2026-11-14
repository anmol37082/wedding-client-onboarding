'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, fmtDate } from '../../../lib/api';
import { useSession } from '../../../lib/useSession';
import { Alert, Loading, StatusBadge } from '../../../components/ui';
import ProfileBar from '../../../components/ProfileBar';

export default function StaffDashboard() {
  const { user, loading, error } = useSession({ intent: 'staff' });
  const [vacancyData, setVacancyData] = useState(null);
  const [openCount, setOpenCount] = useState(0);
  const [err, setErr] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!user.staff) { setErr('NO_PROFILE'); setReady(true); return; }
    const work = [
      api('/staff/vacancies/mine').then(setVacancyData),
      api('/staff/vacancies/open').then((result) => setOpenCount(result.vacancies.length)),
    ];
    Promise.all(work).catch((e) => setErr(e.message)).finally(() => setReady(true));
  }, [user]);

  async function readUpdates() {
    try { await api('/staff/vacancies/notifications/read', { method: 'PATCH', body: {} }); window.dispatchEvent(new Event('staff-notifications-read')); const result = await api('/staff/vacancies/mine'); setVacancyData(result); }
    catch (e) { setErr(e.message); }
  }

  if (loading || (user && !ready)) return <Loading text="Loading your staff space..." />;
  if (error) return <main className="narrow"><Alert>{error}</Alert></main>;
  if (!user) return null;
  const applications = vacancyData?.applications || [];
  const notifications = vacancyData?.notifications || [];
  const activeApplications = applications.filter((item) => !['Selected', 'Rejected'].includes(item.stage));
  const interviewApplications = applications.filter((item) => item.stage === 'Interview Scheduled');
  const selectedApplications = applications.filter((item) => item.stage === 'Selected');
  const nextInterview = interviewApplications.filter((item) => item.interviewAt && new Date(item.interviewAt) >= new Date()).sort((a, b) => new Date(a.interviewAt) - new Date(b.interviewAt))[0];

  return <>
    <ProfileBar user={user} current="staff" />
    <main className="wrap dashboard-main staff-dashboard" id="staff-application">
      <p className="dashboard-eyebrow">STAFF SPACE</p>
      <h1>Hi, {user.staff?.name?.split(' ')[0] || 'there'}</h1>

      {vacancyData?.unreadCount > 0 && <Link className="staff-update-banner" href="/staff/vacancies#updates"><span className="staff-update-icon">{vacancyData.unreadCount}</span><span><strong>Hiring update{vacancyData.unreadCount > 1 ? 's' : ''}</strong><small>Tap to see the latest on your applications</small></span><b>›</b></Link>}

      {err === 'NO_PROFILE' ? <section className="card staff-empty-card"><span className="staff-card-icon">✦</span><h2>Build your staff profile</h2><p>Complete your details to apply for open event roles.</p><Link className="btn btn-primary" href="/staff/apply">Create staff profile</Link></section>
        : err ? <Alert>{err}</Alert>
          : <>
            <section className="staff-overview-card"><div className="staff-overview-heading"><div><span className="staff-overline">YOUR ACTIVITY</span><h2>Application overview</h2></div><StatusBadge status={user.staff?.employeeAuthorized ? 'Approved' : 'Staff'} /></div>
              <div className="staff-metric-grid">
                <Link href="/staff/vacancies#my-applications" className="staff-metric"><span className="staff-metric-icon">▤</span><strong>{applications.length}</strong><small>Applied</small></Link>
                <Link href="/staff/vacancies#my-applications" className="staff-metric"><span className="staff-metric-icon">◷</span><strong>{activeApplications.length}</strong><small>In progress</small></Link>
                <Link href="/staff/vacancies#my-applications" className="staff-metric"><span className="staff-metric-icon">◉</span><strong>{interviewApplications.length}</strong><small>Interviews</small></Link>
                <Link href="/staff/vacancies#my-applications" className="staff-metric"><span className="staff-metric-icon">✓</span><strong>{selectedApplications.length}</strong><small>Selected</small></Link>
              </div>
            </section>
            {nextInterview && <Link className="staff-interview-card" href="/staff/vacancies#my-applications"><span className="staff-interview-icon">◷</span><span><small>UPCOMING INTERVIEW</small><strong>{nextInterview.vacancy?.title || 'Staff vacancy'}</strong><em>{fmtDate(nextInterview.interviewAt, true)}{nextInterview.interviewLocation ? ` · ${nextInterview.interviewLocation}` : ''}</em></span><b>›</b></Link>}
          </>}

      <section className="staff-vacancy-promo"><div><span className="staff-promo-icon">✦</span><span><small>{openCount} OPEN POSITION{openCount === 1 ? '' : 'S'}</small><strong>Explore staff vacancies</strong></span></div><Link href="/staff/vacancies" aria-label="View vacancies">›</Link></section>

      {applications.length > 0 && <section className="staff-my-vacancies" id="my-applications"><div className="staff-section-heading"><div><span className="staff-overline">HIRING PIPELINE</span><h2>My applications</h2></div><Link href="/staff/vacancies">See all</Link></div>
        <div className="staff-vacancy-list">{applications.slice(0, 3).map((item) => <article className="staff-vacancy-item" key={item._id}><div className="staff-vacancy-item-top"><div><strong>{item.vacancy?.title || 'Staff vacancy'}</strong><small>{item.vacancy?.city}{item.vacancy?.location ? ` · ${item.vacancy.location}` : ''}</small></div><StatusBadge status={item.stage} /></div>{item.interviewAt && <p>Interview · {fmtDate(item.interviewAt, true)}</p>}{item.joiningDate && <p>Joining · {fmtDate(item.joiningDate)}</p>}</article>)}</div>
      </section>}

      {notifications.length > 0 && <section className="staff-recent-updates"><div className="staff-section-heading"><div><span className="staff-overline">LATEST NEWS</span><h2>Recent updates</h2></div>{vacancyData?.unreadCount > 0 && <button onClick={readUpdates}>Mark read</button>}</div>{notifications.slice(0, 2).map((notice) => <article className="staff-notice-row" key={notice.id}><span aria-hidden="true">{notice.read ? '•' : '!'}</span><div><strong>{notice.title}</strong><p>{notice.message}</p><small>{fmtDate(notice.createdAt, true)}</small></div></article>)}</section>}
    </main>
  </>;
}
