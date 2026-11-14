'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, fmtDate } from '../../../lib/api';
import { useSession } from '../../../lib/useSession';
import { Alert, Loading, StatusBadge } from '../../../components/ui';
import ProfileBar from '../../../components/ProfileBar';

export default function ClientDashboard() {
  const { user, loading, error } = useSession({ intent: 'client' });
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) api('/client/request').then(setData).catch((e) => setErr(e.status === 403 ? 'NO_PROFILE' : e.message));
  }, [user]);

  async function markWeddingDone() {
    if (!window.confirm('Mark this wedding as completed? You can then start a new booking from the same account.')) return;
    setBusy(true); setErr('');
    try {
      const result = await api('/client/request/complete', { method: 'POST', body: {} });
      setData((current) => ({ ...current, request: result.request }));
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (loading) return <Loading text="Loading your dashboard..." />;
  if (error) return <main className="narrow"><Alert>{error}</Alert></main>;
  if (!user) return null;

  const request = data?.request;
  const submitted = request?.state === 'submitted';
  const statusCopy = { New: 'Request received; planner review is pending', 'In Review': 'Jashne Riyasat is reviewing your wedding brief', Confirmed: 'Your booking has been confirmed', Completed: 'Wedding completed' };

  return <>
    <ProfileBar user={user} current="client" />
    <main className="wrap dashboard-main client-dashboard" id="client-request">
      <p className="dashboard-eyebrow">CLIENT SPACE</p>
      <h1>Hi, {user.client?.name?.split(' ')[0] || 'there'}</h1>
      {data?.request?.pendingRevision && <Link className="client-notification" href="/client/review-changes"><span className="client-notification-icon" aria-hidden="true">!</span><span><strong>Booking update needs your review</strong><small>{data.request.pendingRevision.changes.length} change(s) from the admin team</small></span><b aria-hidden="true">›</b></Link>}

      {err === 'NO_PROFILE'
        ? <div className="card client-empty-card"><span className="client-state-icon" aria-hidden="true">+</span><h2>Welcome</h2><p>Create your client profile to start planning.</p><Link className="btn btn-primary" href="/client/apply">Create profile</Link></div>
        : err ? <Alert>{err}</Alert>
          : !data ? <Loading text="Loading your booking..." />
            : request?.weddingDoneAt
              ? <div className="card client-empty-card"><span className="client-state-icon" aria-hidden="true">✓</span><h2>Wedding complete</h2><p>Your booking is saved in your history.</p><Link className="btn btn-primary" href="/client/apply">Plan another wedding</Link></div>
              : !submitted
                ? <div className="card client-empty-card"><span className="client-state-icon" aria-hidden="true">♡</span><h2>Continue planning</h2><p>Your booking is ready for you to finish.</p><Link className="btn btn-primary" href="/client/apply">Continue booking</Link></div>
                : <section className="card client-request-card" aria-labelledby="booking-title">
                    <div className="client-status-head"><span className="client-overline" id="booking-title">CURRENT BOOKING</span><StatusBadge status={request.status} /></div>
                    <p className="client-status-copy">{statusCopy[request.status] || 'Your request has been updated'}</p>
                    <div className="client-summary-grid">
                      <div className="client-summary-item"><span className="client-summary-icon" aria-hidden="true">▦</span><span><small>WEDDING DATE</small><strong>{fmtDate(request.weddingDate)}</strong></span></div>
                      <div className="client-summary-item"><span className="client-summary-icon" aria-hidden="true">⌖</span><span><small>VENUE</small><strong>{request.venue}</strong></span></div>
                    </div>
                    {request.statusUpdatedAt && <p className="client-updated">Updated {fmtDate(request.statusUpdatedAt, true)}</p>}
                    {open && <div className="client-details">
                      <dl className="kv"><dt>Event type</dt><dd>{request.eventType}</dd><dt>Location</dt><dd>{request.eventLocation}</dd><dt>Guests</dt><dd>{request.guests}</dd><dt>Submitted</dt><dd>{fmtDate(request.submittedAt, true)}</dd><dt>Notes</dt><dd>{request.additionalRequirements || '-'}</dd></dl>
                      {!!request.planning?.functions?.length && <><h3>Functions</h3><ul>{request.planning.functions.map((item, index) => <li key={`${item.name}-${index}`}>{item.name} · {fmtDate(item.date)} · {[item.venue, item.city].filter(Boolean).join(', ')}</li>)}</ul></>}
                      <p className="small muted">Your signed brief records requested services and commercial preferences. It does not confirm the booking; review and sign the Planner’s written proposal before confirmation.</p>
                    </div>}
                    <div className="client-actions">
                      <button className="client-secondary-action" onClick={() => setOpen(!open)} aria-expanded={open}><span aria-hidden="true">{open ? '-' : '+'}</span>{open ? 'Hide details' : 'Details'}</button>
                      {data.documentId && <Link className="client-secondary-action" href={`/document/${data.documentId}`}><span aria-hidden="true">▤</span>Document</Link>}
                      <Link className="btn btn-primary" href="/client/apply">Edit booking</Link>
                    </div>
                    {!request.weddingDoneAt && <button className="client-complete-action" onClick={markWeddingDone} disabled={busy}>{busy ? 'Saving...' : 'Mark wedding as complete'}</button>}
                  </section>}

      {!!request?.bookingHistory?.length && <section className="card client-history" id="client-history">
        <div className="client-history-heading"><h2>Previous weddings</h2><span>{request.bookingHistory.length}</span></div>
        {request.bookingHistory.slice().reverse().map((booking, i) => <article className="client-history-item" key={`${booking.completedAt || booking.submittedAt}-${i}`}>
          <div><strong>{booking.eventType || 'Wedding'}</strong><small>{booking.venue || 'Venue not set'}</small></div>
          <StatusBadge status={booking.status} />
          <p>{fmtDate(booking.weddingDate)}{booking.completedAt ? ` · Completed ${fmtDate(booking.completedAt)}` : ''}</p>
          {booking.documentId && <Link href={`/document/${booking.documentId}`}>View document <span aria-hidden="true">›</span></Link>}
        </article>)}
      </section>}
    </main>
  </>;
}
