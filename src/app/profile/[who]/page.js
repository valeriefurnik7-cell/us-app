'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { Block, BlockFooter, BlockTitle, Button, List, ListItem, Toast } from 'konsta/react';
import Screen, { EmptyState } from '@/components/Screen';
import { InnerNavbar } from '@/components/AppNavbar';
import Avatar from '@/components/Avatar';
import InviteCard from '@/components/InviteCard';
import ProfileSheet from '@/components/ProfileSheet';
import { useSession } from '@/components/SessionProvider';
import { supabase } from '@/lib/supabase';
import { ADDRESS_FIELDS, formatAddress } from '@/lib/address';

const formatBirthday = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

export default function ProfilePage({ params }) {
  const { who } = use(params);
  if (who !== 'me' && who !== 'friend') notFound();
  const isMe = who === 'me';

  const { me, partner } = useSession();
  const profile = isMe ? me : partner;
  const [address, setAddress] = useState(null);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadAddress = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase.from('addresses').select('*').eq('profile_id', profile.id).maybeSingle();
    setAddress(data);
  }, [profile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (!cancelled) await loadAddress();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAddress]);

  async function copyAddress() {
    await navigator.clipboard.writeText(formatAddress(address));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!profile) {
    return (
      <Screen>
        <InnerNavbar title="Friend" />
        <InviteCard />
      </Screen>
    );
  }

  const hasAddress = address && ADDRESS_FIELDS.some((f) => address[f.key]);

  return (
    <Screen>
      <InnerNavbar title={isMe ? 'My profile' : profile.name} />

      <div className="mt-2 flex flex-col items-center gap-2">
        <Avatar who={isMe ? 'me' : 'her'} name={profile.name} size="lg" />
        <p className="text-title font-semibold">{profile.name}</p>
      </div>

      <List strong inset>
        <ListItem title="City" after={profile.city || '—'} />
        <ListItem title="Birthday" after={formatBirthday(profile.birthday)} />
      </List>

      <BlockTitle>Delivery address</BlockTitle>
      {hasAddress ? (
        <>
          <List strong inset>
            {ADDRESS_FIELDS.filter((f) => address[f.key]).map((f) => (
              <ListItem key={f.key} title={f.label} after={address[f.key]} />
            ))}
          </List>
          <BlockFooter>
            {isMe ? 'Only your friend can see your address.' : 'Paste it into the shop when you order a gift.'}
          </BlockFooter>
        </>
      ) : (
        <EmptyState
          title="No address yet"
          text={
            isMe
              ? 'Add it so your friend can send you gifts. Only she can see it.'
              : `${profile.name} hasn't added an address yet`
          }
        />
      )}

      <Block>
        {isMe ? (
          <Button large rounded onClick={() => setEditing(true)}>
            Edit profile
          </Button>
        ) : (
          hasAddress && (
            <Button large rounded onClick={copyAddress}>
              Copy full address
            </Button>
          )
        )}
      </Block>

      {isMe && (
        <ProfileSheet
          opened={editing}
          address={address}
          onClose={() => setEditing(false)}
          onSaved={loadAddress}
        />
      )}
      <Toast position="center" opened={copied}>
        Address copied
      </Toast>
    </Screen>
  );
}
