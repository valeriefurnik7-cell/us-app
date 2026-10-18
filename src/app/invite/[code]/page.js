'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { savePendingInvite } from '@/lib/invite';

// Stores the code and continues to sign-in / onboarding, which picks it up.
export default function InvitePage({ params }) {
  const { code } = use(params);
  const router = useRouter();

  useEffect(() => {
    savePendingInvite(code);
    router.replace('/');
  }, [code, router]);

  return null;
}
