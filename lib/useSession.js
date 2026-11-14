'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';

// Loads the logged-in account. With require=true, visitors without a session are sent to /login.
export function useSession({ require = true, intent = '' } = {}) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try { setUser(await api(`/auth/me${intent ? `?context=${encodeURIComponent(intent)}` : ''}`)); setError(''); }
    catch (e) {
      setUser(null);
      if (e.status === 401) { if (require) router.replace(`/login${intent ? `?intent=${intent}` : ''}`); }
      else setError(e.message);
    } finally { setLoading(false); }
  }, [require, intent, router]);
  useEffect(() => { refresh(); }, [refresh]);
  return { user, loading, error, refresh };
}
