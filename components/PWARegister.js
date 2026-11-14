'use client';
import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .then(() => {
          if (navigator.serviceWorker.controller) window.location.reload();
        })
        .catch(() => {});
      return undefined;
    }

    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;
    const refreshOnUpdate = () => {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', refreshOnUpdate);
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch(() => {});

    return () => navigator.serviceWorker.removeEventListener('controllerchange', refreshOnUpdate);
  }, []);

  return null;
}
