'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../../lib/api';
import { Alert, Empty, Loading, StatusBadge } from '../../../../components/ui';

export default function JobPositions() {
  const [list, setList] = useState(null); const [err, setErr] = useState(''); const [name, setName] = useState('');
  const [editId, setEditId] = useState(null); const [editName, setEditName] = useState('');
  const load = useCallback(() => { api('/admin/job-positions').then((d) => setList(d.positions)).catch((e) => setErr(e.message)); }, []);
  useEffect(load, [load]);
  const run = async (fn) => { setErr(''); try { await fn(); load(); } catch (e) { setErr(e.fields?.name || e.message); } };

  return (
    <>
      <h1 style={{ fontSize: '2rem' }}>Job positions</h1>
      <form className="row" style={{ marginBottom: 20, flexWrap: 'nowrap' }} onSubmit={(e) => { e.preventDefault(); run(async () => { await api('/admin/job-positions', { method: 'POST', body: { name } }); setName(''); }); }}>
        <input className="input" aria-label="New position name" placeholder="New position name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        <button className="btn btn-primary" disabled={!name.trim()}>Add</button>
      </form>
      <Alert>{err}</Alert>
      {!list && !err && <Loading />}
      {list && (list.length === 0 ? <Empty>No job positions yet. Add the first one above.</Empty> :
        <div className="table-wrap"><table>
          <thead><tr><th scope="col">Name</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
          <tbody>{list.map((p) => (
            <tr key={p._id}>
              <td>{editId === p._id ? <input className="input" aria-label="Position name" value={editName} onChange={(e) => setEditName(e.target.value)} /> : p.name}</td>
              <td><StatusBadge status={p.active ? 'Approved' : 'Rejected'} /> <span className="small muted">{p.active ? 'Active' : 'Disabled'}</span></td>
              <td><span className="row" style={{ flexWrap: 'nowrap' }}>
                {editId === p._id ? <>
                  <button className="btn btn-sm btn-primary" onClick={() => run(async () => { await api(`/admin/job-positions/${p._id}`, { method: 'PUT', body: { name: editName } }); setEditId(null); })}>Save</button>
                  <button className="btn btn-sm" onClick={() => setEditId(null)}>Cancel</button></> : <>
                  <button className="btn btn-sm" onClick={() => { setEditId(p._id); setEditName(p.name); }}>Edit</button>
                  <button className="btn btn-sm" onClick={() => run(() => api(`/admin/job-positions/${p._id}`, { method: 'PUT', body: { active: !p.active } }))}>{p.active ? 'Disable' : 'Enable'}</button>
                  <button className="btn btn-sm btn-danger" onClick={() => window.confirm(`Delete "${p.name}"?`) && run(() => api(`/admin/job-positions/${p._id}`, { method: 'DELETE' }))}>Delete</button></>}
              </span></td>
            </tr>))}</tbody>
        </table></div>)}
      <p className="small muted" style={{ marginTop: 12 }}>Positions already used by an application can’t be deleted — disable them instead.</p>
    </>
  );
}
