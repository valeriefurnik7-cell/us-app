'use client';

import { useEffect, useState } from 'react';
import NextLink from '@/components/AppLink';
import { Link, Sheet, Toolbar } from 'konsta/react';
import Avatar from './Avatar';
import InviteCard from './InviteCard';
import { useSession } from './SessionProvider';
import { supabase } from '@/lib/supabase';

const count = async (table) => (await supabase.from(table).select('*', { count: 'exact', head: true })).count ?? 0;

function Member({ profile, who, label }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
      <Avatar who={who} name={profile?.name ?? '+'} src={profile?.avatar} size="md" className={profile ? '' : 'opacity-50'} />
      <p className="text-subhead font-semibold">{profile?.name ?? 'Waiting…'}</p>
      <p className="text-caption text-text-secondary">{profile?.city || label}</p>
    </div>
  );
}

function PairInfo({ onClose }) {
  const { me, partner, pair } = useSession();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([count('cats'), count('cat_posts'), count('events')]).then(([pets, posts, events]) => {
      if (!cancelled) setStats({ pets, posts, events });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const since = pair?.created_at
    ? new Date(pair.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <span className="ps-2 text-body font-semibold">Our space</span>
        <Link toolbar onClick={onClose}>
          Done
        </Link>
      </Toolbar>
      <div className="max-h-[75vh] overflow-auto pb-safe-4">
        <div className="px-4 pt-2 text-center">
          <p className="text-title font-bold">{pair?.name}</p>
          <p className="text-subhead text-text-secondary">Since {since}</p>
        </div>

        <div className="mx-4 mt-4 flex rounded-card bg-surface-2/60 px-2 py-4">
          <Member profile={me} who="me" label="You" />
          <Member profile={partner} who="her" label={partner ? 'Friend' : 'Not joined yet'} />
        </div>

        <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
          {[
            ['pets', 'Pets', '/pets'],
            ['posts', 'Messages', '/pets'],
            ['events', 'Plans', '/plans'],
          ].map(([key, label, href]) => (
            <NextLink key={key} href={href} onClick={onClose} className="rounded-card bg-surface-2/60 px-2 py-3 text-center">
              <p className="text-title font-bold">{stats ? stats[key] : '–'}</p>
              <p className="text-caption text-text-secondary">{label}</p>
            </NextLink>
          ))}
        </div>

        {!partner && <InviteCard />}

        <div className="px-4 pt-4 text-center">
          <NextLink href="/settings" onClick={onClose} className="text-subhead text-primary">
            Rename our space
          </NextLink>
        </div>
      </div>
    </>
  );
}

/** Opens from the pair pill in the header. */
export default function PairSheet({ opened, onClose }) {
  return (
    <Sheet opened={opened} onBackdropClick={onClose} className="w-full">
      {opened && <PairInfo onClose={onClose} />}
    </Sheet>
  );
}
