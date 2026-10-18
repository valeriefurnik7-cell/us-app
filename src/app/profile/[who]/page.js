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
import NextLink from '@/components/AppLink';
import PetSheet from '@/components/pets/PetSheet';
import { SPECIES, usePets } from '@/lib/pets';
import { Paw, Plus } from 'framework7-icons/react';

/** Her or my pets, as cards that open the pet's page. */
function ProfilePets({ ownerId, isMe }) {
  const pets = usePets();
  const [adding, setAdding] = useState(false);
  const mine = (pets.data ?? []).filter((p) => p.owner_id === ownerId);
  if (!pets.loading && !mine.length && !isMe) return null;
  return (
    <>
      <BlockTitle>Pets</BlockTitle>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
        {pets.loading
          ? [0, 1].map((i) => <div key={i} className="h-36 w-28 shrink-0 animate-pulse rounded-card bg-surface" />)
          : mine.map((pet) => (
              <NextLink key={pet.id} href={`/pets/${pet.id}`} className="w-28 shrink-0">
                <span className="flex aspect-square items-center justify-center overflow-hidden rounded-card bg-surface text-text-secondary">
                  {pet.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pet.cover} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Paw className="text-[32px]" />
                  )}
                </span>
                <span className="mt-1.5 block truncate text-subhead font-semibold">{pet.name}</span>
                <span className="block truncate text-caption text-text-secondary">{pet.breed || SPECIES.find((s) => s.id === pet.species)?.label}</span>
              </NextLink>
            ))}
        {isMe && !pets.loading && (
          <button type="button" onClick={() => setAdding(true)} className="w-28 shrink-0 text-start">
            <span className="flex aspect-square items-center justify-center rounded-card border-2 border-dashed border-text-secondary/25 text-primary">
              <Plus className="text-[26px]" />
            </span>
            <span className="mt-1.5 block text-subhead font-semibold text-primary">Add pet</span>
          </button>
        )}
      </div>
      {isMe && <PetSheet opened={adding} pet={null} onClose={() => setAdding(false)} onSaved={pets.reload} />}
    </>
  );
}

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
        <Avatar who={isMe ? 'me' : 'her'} name={profile.name} src={profile.avatar} size="lg" />
        <p className="text-title font-semibold">{profile.name}</p>
      </div>

      <List strong inset>
        <ListItem title="City" after={profile.city || '—'} />
        <ListItem title="Birthday" after={formatBirthday(profile.birthday)} />
      </List>

      <ProfilePets ownerId={profile.id} isMe={isMe} />

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
