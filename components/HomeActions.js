'use client';
import Link from 'next/link';
import { useSession } from '../lib/useSession';

function destination(user, intent) {
  if (!user) return `/login${intent ? `?intent=${intent}` : ''}`;
  if (intent) return user[intent] ? `/${intent}/dashboard` : `/${intent}/apply`;
  if (user.client && !user.staff) return '/client/dashboard';
  if (user.staff && !user.client) return '/staff/dashboard';
  return '/client/dashboard';
}

export function HomeLoginLink() {
  const { user, loading } = useSession({ require: false });
  if (loading) return <span className="btn btn-sm" aria-disabled="true">Checking session…</span>;
  return <Link className="btn btn-sm" href={destination(user, '')}>{user ? 'Open dashboard' : 'Log in'}</Link>;
}

export function HomeGetStarted({ className = 'btn btn-gold btn-lg' }) {
  const { user, loading } = useSession({ require: false });
  if (loading) return <span className={className} aria-disabled="true">Checking session…</span>;
  return <Link className={className} href={destination(user, 'client')}>{user?.client ? 'Open dashboard' : 'Get started'}</Link>;
}

export function ApplyAsStaffLink({ className = 'btn btn-primary btn-lg' }) {
  const { user, loading } = useSession({ require: false });
  if (loading) return <span className={className} aria-disabled="true">Checking session…</span>;
  return <Link className={className} href={destination(user, 'staff')}>{user?.staff ? 'Open staff dashboard' : 'Apply as staff'}</Link>;
}
