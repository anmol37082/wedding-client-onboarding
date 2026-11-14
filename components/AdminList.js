'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, fmtDate, formatMobile } from '../lib/api';
import { Alert, Empty, Loading, Pagination, StatusBadge } from './ui';
import AdminDetail from './AdminDetail';

const STATUS = { staff: ['Pending', 'Approved', 'Rejected'], client: ['New', 'In Review', 'Confirmed', 'Completed'] };
const COLS = {
  staff: [['Name', (r) => r.name], ['Mobile', (r) => formatMobile(r.mobile)], ['Position', (r) => r.position], ['Experience', (r) => `${r.experienceYears} yr`], ['City', (r) => r.city], ['Status', (r) => <StatusBadge status={r.status} />], ['Employee access', (r) => r.employeeAuthorized ? 'Authorized' : 'Not authorized'], ['Registered', (r) => fmtDate(r.registeredAt)]],
  client: [['Name', (r) => r.name], ['Mobile', (r) => formatMobile(r.mobile)], ['Wedding date', (r) => fmtDate(r.weddingDate)], ['Venue', (r) => r.venue], ['Guests', (r) => r.guests], ['Status', (r) => <StatusBadge status={r.status} />]],
};

export default function AdminList({ kind }) {
  const [f, setF] = useState({ q: '', city: '', position: '', status: '', from: '', to: '', regFrom: '', regTo: '' });
  const [applied, setApplied] = useState(f); const [page, setPage] = useState(1);
  const [data, setData] = useState(null); const [err, setErr] = useState(''); const [positions, setPositions] = useState([]); const [openId, setOpenId] = useState(null);

  useEffect(() => { if (kind === 'staff') api('/admin/job-positions').then((d) => setPositions(d.positions)).catch(() => {}); }, [kind]);
  const load = useCallback(() => {
    const qs = new URLSearchParams({ page, ...Object.fromEntries(Object.entries(applied).filter(([, v]) => v)) });
    setErr(''); api(`/admin/${kind === 'staff' ? 'staff' : 'clients'}?${qs}`).then(setData).catch((e) => setErr(e.message));
  }, [kind, applied, page]);
  useEffect(load, [load]);

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const search = (e) => { e.preventDefault(); setPage(1); setApplied(f); };
  const reset = () => { const z = Object.fromEntries(Object.keys(f).map((k) => [k, ''])); setF(z); setApplied(z); setPage(1); };
  const label = (t, el) => <label><span className="small muted">{t}</span>{el}</label>;

  return (
    <>
      <h1 style={{ fontSize: '2rem' }}>{kind === 'staff' ? 'Staff' : 'Clients'}</h1>
      <form onSubmit={search}>
        <div className="filters">
          {label('Name or mobile', <input className="input" value={f.q} onChange={set('q')} />)}
          {label('City', <input className="input" value={f.city} onChange={set('city')} />)}
          {kind === 'staff' && label('Job role', <select className="input" value={f.position} onChange={set('position')}><option value="">All</option>{positions.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select>)}
          {label('Status', <select className="input" value={f.status} onChange={set('status')}><option value="">All</option>{STATUS[kind].map((s) => <option key={s}>{s}</option>)}</select>)}
          {kind === 'client' && label('Wedding from', <input className="input" type="date" value={f.from} onChange={set('from')} />)}
          {kind === 'client' && label('Wedding to', <input className="input" type="date" value={f.to} onChange={set('to')} />)}
          {label('Registered from', <input className="input" type="date" value={f.regFrom} onChange={set('regFrom')} />)}
          {label('Registered to', <input className="input" type="date" value={f.regTo} onChange={set('regTo')} />)}
        </div>
        <div className="row" style={{ marginBottom: 16 }}><button className="btn btn-primary btn-sm">Search</button><button type="button" className="btn btn-sm" onClick={reset}>Reset</button></div>
      </form>
      <Alert>{err}</Alert>
      {!data && !err && <Loading />}
      {data && (data.items.length === 0 ? <Empty>{kind === 'staff' ? 'No staff applications found.' : 'No client requests found.'}</Empty> : <>
        <div className="table-wrap admin-desktop-table"><table>
          <thead><tr>{COLS[kind].map(([h]) => <th key={h} scope="col">{h}</th>)}<th scope="col">Actions</th></tr></thead>
          <tbody>{data.items.map((r) => (
            <tr key={r.id}>{COLS[kind].map(([h, fn]) => <td key={h}>{fn(r)}</td>)}
              <td><button className="btn btn-sm" onClick={() => setOpenId(r.id)}>{kind === 'client' ? 'View / edit' : 'View'}</button></td></tr>))}</tbody>
        </table></div>
        <div className="admin-mobile-records">{data.items.map((r) => <article className="admin-record-card" key={r.id}>
          <div className="admin-record-top"><div><strong>{r.name}</strong><small>{formatMobile(r.mobile)}</small></div><StatusBadge status={r.status} /></div>
          <div className="admin-record-meta">{kind === 'client' ? <><span><small>WEDDING</small>{fmtDate(r.weddingDate)}</span><span><small>VENUE</small>{r.venue}</span><span><small>GUESTS</small>{r.guests}</span></> : <><span><small>POSITION</small>{r.position}</span><span><small>CITY</small>{r.city}</span><span><small>EXPERIENCE</small>{r.experienceYears} yr</span></>}</div>
          <button className="btn btn-primary btn-sm admin-record-action" onClick={() => setOpenId(r.id)}>{kind === 'client' ? 'Review & edit client request' : 'Review application'}</button>
        </article>)}</div>
        <p className="small muted">{data.total} record{data.total === 1 ? '' : 's'}</p>
        <Pagination page={data.page} pages={data.pages} onPage={setPage} />
      </>)}
      {openId && <AdminDetail kind={kind} id={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </>
  );
}
