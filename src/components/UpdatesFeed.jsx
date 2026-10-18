'use client';

import NextLink from '@/components/AppLink';
import { Airplane, Film, Gift, MapPin, Paw, Sparkles } from 'framework7-icons/react';
import Avatar from './Avatar';
import { useSession } from './SessionProvider';
import { timeAgo, dayKey } from '@/lib/dates';

function dayLabel(iso) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today)) return 'Today';
  if (dayKey(iso) === dayKey(yesterday)) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** "Masha · 2 hours ago" line shared by every card. */
function Byline({ item, light }) {
  const { me, partner } = useSession();
  const mine = item.actor_id === me.id;
  const who = mine ? me : partner;
  return (
    <span className={`flex items-center gap-1.5 text-caption ${light ? 'text-white/85' : 'text-text-secondary'}`}>
      <Avatar who={mine ? 'me' : 'her'} name={who?.name} src={who?.avatar} className="h-7! w-7! text-[12px]!" />
      <b className="font-semibold">{mine ? 'You' : who?.name}</b>
      <span>· {timeAgo(item.created_at)}</span>
    </span>
  );
}

const ICONS = { gift: Gift, watch: Film, dream: Sparkles, place: MapPin, trip: Airplane, pet_added: Paw, cat_added: Paw };

/** Each kind of update has its own shape, so the feed reads like a magazine, not a list. */
function UpdateCard({ item }) {
  const base = 'block overflow-hidden rounded-card bg-surface';

  // Pet photos and trips/places with a picture: big photo with the text on it.
  if (item.thumbSrc && ['pet_photo', 'cat_photo', 'trip', 'place'].includes(item.kind)) {
    return (
      <NextLink href={item.href} className={`${base} relative`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.thumbSrc} alt="" loading="lazy" className={`w-full object-cover ${item.kind.includes('photo') ? 'aspect-[4/3]' : 'aspect-[2/1]'}`} />
        <span className="absolute inset-x-0 bottom-0 bg-black/45 px-3 pt-2 pb-2.5 text-white backdrop-blur-sm">
          <span className="block text-body leading-snug font-semibold">
            {item.kind === 'place' ? item.detail : item.kind === 'trip' ? item.text.replace('added a trip to', 'Trip to') : item.detail || 'New pet photo'}
          </span>
          <Byline item={item} light />
        </span>
      </NextLink>
    );
  }

  // A plan: a calendar page with the date.
  if (item.kind === 'event' && item.date) {
    const d = new Date(item.date);
    return (
      <NextLink href={item.href} className={`${base} flex items-center gap-3 p-3`}>
        <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-control bg-surface-2">
          <span className="w-full bg-danger py-0.5 text-center text-[10px] font-bold text-white uppercase">{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
          <span className="text-title leading-tight font-bold">{d.getDate()}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-semibold">{item.detail || 'New plan'}</span>
          <Byline item={item} />
        </span>
      </NextLink>
    );
  }

  // New pet: a round portrait.
  if (item.kind === 'pet_added' || item.kind === 'cat_added') {
    return (
      <NextLink href={item.href} className={`${base} flex items-center gap-3 p-3`}>
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-text-secondary">
          {item.thumbSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumbSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <Paw className="text-[24px]" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold">{item.text.replace('added ', 'Meet ').replace(' to the pets', '')}</span>
          <Byline item={item} />
        </span>
      </NextLink>
    );
  }

  // Wishes, watch list, dreams and the rest: picture or icon tile + title.
  const Icon = ICONS[item.kind] ?? Sparkles;
  const tall = item.kind === 'watch';
  return (
    <NextLink href={item.href} className={`${base} flex items-center gap-3 p-3`}>
      <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-control bg-accent/12 text-primary ${tall ? 'h-[72px] w-12' : 'h-14 w-14'}`}>
        {item.thumbSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbSrc} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <Icon className="text-[22px]" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-caption font-semibold tracking-wide text-text-secondary uppercase">{item.text}</span>
        {item.detail && <span className="block text-body leading-snug font-semibold">{item.detail}</span>}
        <Byline item={item} />
      </span>
    </NextLink>
  );
}

/** Updates from both of you, as separate cards; grouped by day when `grouped`. */
export default function UpdatesFeed({ items, loading, grouped = false, empty }) {
  if (loading) {
    return (
      <div className="mx-4 space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-card bg-surface" />
        ))}
      </div>
    );
  }
  if (!items.length) return <p className="mx-4 rounded-card bg-surface px-4 py-6 text-center text-subhead text-text-secondary">{empty}</p>;

  const list = (rows) => (
    <div className="mx-4 space-y-2.5">
      {rows.map((i) => (
        <UpdateCard key={i.id} item={i} />
      ))}
    </div>
  );
  if (!grouped) return list(items);

  const days = items.reduce((acc, i) => {
    (acc[dayKey(i.created_at)] ??= []).push(i);
    return acc;
  }, {});
  return Object.values(days).map((rows) => (
    <section key={dayKey(rows[0].created_at)}>
      <h3 className="mx-8 mt-5 mb-1.5 text-caption font-semibold tracking-wide text-text-secondary uppercase">{dayLabel(rows[0].created_at)}</h3>
      {list(rows)}
    </section>
  ));
}
