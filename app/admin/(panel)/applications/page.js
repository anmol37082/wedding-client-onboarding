'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, fmtDate, formatMobile } from '../../../../lib/api';
import { Alert, Empty, Loading, StatusBadge } from '../../../../components/ui';
import AdminDetail from '../../../../components/AdminDetail';

export default function Applications() {
  const [items, setItems] = useState(null); const [err, setErr] = useState(''); const [open, setOpen] = useState(null);
  const load = useCallback(() => { api('/admin/applications').then((d) => setItems(d.items)).catch((e) => setErr(e.message)); }, []);
  useEffect(load, [load]);
  return (
    <>
      <h1 style={{ fontSize: '2rem' }}>Applications</h1>
      <p className="muted">Pending staff applications and new client requests, newest first.</p>
      <Alert>{err}</Alert>
      {!items && !err && <Loading />}
      {items && (items.length === 0 ? <Empty>No applications need review.</Empty> :
        <div className="table-wrap"><table>
          <thead><tr><th scope="col">Type</th><th scope="col">Name</th><th scope="col">Mobile</th><th scope="col">Summary</th><th scope="col">Status</th><th scope="col">Submitted</th><th scope="col">Actions</th></tr></thead>
          <tbody>{items.map((r) => <tr key={`${r.type}${r.id}`}><td>{r.type === 'staff' ? 'Staff' : 'Client'}</td><td>{r.name}</td><td>{formatMobile(r.mobile)}</td><td>{r.summary}</td><td><StatusBadge status={r.status} /></td><td>{fmtDate(r.submittedAt, true)}</td>
            <td><button className="btn btn-sm" onClick={() => setOpen(r)}>View</button></td></tr>)}</tbody>
        </table></div>)}
      {open && <AdminDetail kind={open.type} id={open.id} onClose={() => setOpen(null)} onChanged={load} />}
    </>
  );
}
