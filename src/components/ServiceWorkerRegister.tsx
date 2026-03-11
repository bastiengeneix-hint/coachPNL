'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/notifications/register-sw';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
