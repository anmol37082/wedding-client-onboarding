'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, fmtDate, formatMobile } from '../../../../lib/api';
import { Alert, Empty, Loading, Pagination } from '../../../../components/ui';

export default function Documents() {
  const [type, setType] = useState(''); const [page, setPage] = useState(1); const [data, setData] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { setErr(''); api(`/admin/documents?page=${page}${type ? `&type=${type}` : ''}`).then(setData).catch((e) => setErr(e.message)); }, [page, type]);
  return (
    <>
      <h1 style={{ fontSize: '2rem' }}>Documents</h1>
      <select className="input" style={{ maxWidth: 220, marginBottom: 16 }} aria-label="Document type" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
        <option value="">All documents</option><option value="client">Client</option><option value="staff">Staff</option></select>
      <Alert>{err}</Alert>
      {!data && !err && <Loading />}
      {data && (data.items.length === 0 ? <Empty>No documents found.</Empty> : <>
        <div className="table-wrap"><table>
          <thead><tr><th scope="col">Type</th><th scope="col">Name</th><th scope="col">Mobile</th><th scope="col">Version</th><th scope="col">Created</th><th scope="col">Actions</th></tr></thead>
          <tbody>{data.items.map((d) => <tr key={d.id}><td>{d.type === 'staff' ? 'Staff' : 'Client'}</td><td>{d.name}</td><td>{formatMobile(d.mobile)}</td><td>v{d.version}</td><td>{fmtDate(d.createdAt, true)}</td>
            <td><span className="row" style={{ flexWrap: 'nowrap' }}><Link className="btn btn-sm" href={`/document/${d.id}`}>View</Link><Link className="btn btn-sm" href={`/document/${d.id}?action=print`}>Print / PDF</Link></span></td></tr>)}</tbody>
        </table></div>
        <Pagination page={data.page} pages={data.pages} onPage={setPage} />
      </>)}
    </>
  );
}
