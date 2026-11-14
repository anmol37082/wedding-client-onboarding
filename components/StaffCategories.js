'use client';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const FALLBACK = ['Waiter', 'Manager', 'Helper', 'Cook', 'Security', 'Cleaner', 'Other'];
// Categories come from Admin > Job Positions; the fallback only shows while loading or offline.
export default function StaffCategories() {
  const [names, setNames] = useState(FALLBACK);
  useEffect(() => { api('/job-positions').then((d) => d.positions.length && setNames(d.positions.map((p) => p.name))).catch(() => {}); }, []);
  return <div className="cats">{names.map((n) => <div className="cat" key={n}>{n}</div>)}</div>;
}
