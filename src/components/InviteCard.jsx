'use client';

import { useState } from 'react';
import { Button, Toast } from 'konsta/react';
import { useSession } from './SessionProvider';
import { inviteUrl } from '@/lib/invite';

/** Shown until the friend joins. */
export default function InviteCard() {
  const { pair, partner } = useSession();
  const [copied, setCopied] = useState(false);
  if (partner || !pair?.invite_code) return null;

  const url = inviteUrl(pair.invite_code);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: pair.name, text: 'Join me in our app', url });
        return;
      } catch {
        // cancelled → fall back to copy
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-4 mt-3 rounded-card bg-surface p-4">
      <p className="text-body font-semibold">Invite your friend</p>
      <p className="mt-1 text-subhead text-text-secondary">
        Only one person can join with this link. After that the pair is closed.
      </p>
      <p className="mt-3 truncate rounded-control bg-surface-2 px-3 py-2 text-subhead">{url}</p>
      <Button large rounded className="mt-3" onClick={share}>
        Share invite link
      </Button>
      <Toast position="center" opened={copied}>
        Link copied
      </Toast>
    </div>
  );
}
