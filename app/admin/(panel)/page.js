'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { Alert, Loading } from '../../../components/ui';

const CARDS = [['totalClients', 'Total clients'], ['totalStaff', 'Total staff'], ['pendingApplications', 'Pending applications'], ['approvedStaff', 'Approved staff'], ['activeClientRequests', 'Active client requests']];
export default function AdminHome() {
  const [s, setS] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api('/admin/stats').then(setS).catch((e) => setErr(e.message)); }, []);
  return (
    <>
      <h1 style={{ fontSize: '2rem' }}>Dashboard</h1>
      <Alert>{err}</Alert>
      {!s && !err ? <Loading /> : s && <div className="grid3">{CARDS.map(([k, l]) => <div className="card stat" key={k}><b>{s[k]}</b>{l}</div>)}</div>}
      <p style={{ marginTop: 24 }}><Link className="btn btn-primary" href="/admin/applications">Review new submissions</Link></p>
    </>
  );
}
