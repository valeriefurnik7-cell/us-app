'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Places now live inside Plans; old links (updates, notifications) land on that tab.
export default function PlacesRedirect() {
  const router = useRouter();
  useEffect(() => {
    try {
      sessionStorage.setItem('plansSegment', 'places');
    } catch {}
    router.replace('/plans');
  }, [router]);
  return null;
}
