'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { Loading, Alert } from '../../components/ui';
function Choose() {
  const router = useRouter();
  const intent = useSearchParams().get('intent') || '';
  const { user, loading, error } = useSession({ intent });
  useEffect(() => {
    if (!user) return;
    if (user.staff && !user.client) router.replace('/staff/dashboard');
    else if (user.client && !user.staff) router.replace('/client/dashboard');
    else {
      const lastSpace = window.localStorage.getItem('wedding-last-space');
      router.replace(lastSpace === 'staff' ? '/staff/dashboard' : '/client/dashboard');
    }
  }, [router, user]);
  if (loading) return <Loading />;
  if (error) return <main className="narrow"><Alert>{error}</Alert></main>;
  return <Loading text="Opening your dashboard..." />;
}
export default function ChoosePage() { return <Suspense fallback={<Loading />}><Choose /></Suspense>; }
