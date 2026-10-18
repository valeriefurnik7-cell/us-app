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

const ICON_TINT = {
  pet_photo: 'bg-her/15 text-her',
  cat_photo: 'bg-her/15 text-her',
  pet_added: 'bg-her/15 text-her',
  cat_added: 'bg-her/15 text-her',
  gift: 'bg-me/15 text-me',
  watch: 'bg-accent/15 text-primary',
  dream: 'bg-together/20 text-together',
  place: 'bg-her/15 text-her',
  trip: 'bg-accent/15 text-primary',
};

/** Every update is the same size; the picture (or a date page / icon) tells the kinds apart. */
function UpdateCard({ item }) {
  const Icon = ICONS[item.kind] ?? Sparkles;
  const date = item.kind === 'event' && item.date ? new Date(item.date) : null;
  const round = item.kind === 'pet_added' || item.kind === 'cat_added';
  const kindLabel = {
    pet_photo: 'Pet photo',
    cat_photo: 'Pet photo',
    pet_added: 'New pet',
    cat_added: 'New pet',
    gift: 'Wish',
    watch: 'To watch',
    dream: 'Dream',
    event: 'Plan',
    trip: 'Trip',
    place: 'Place',
  }[item.kind];
  const title =
    item.kind === 'pet_added' || item.kind === 'cat_added'
      ? item.text.replace('added ', '').replace(' to the pets', '')
      : item.kind === 'trip'
        ? `${item.text.replace('added a trip to ', '')} · ${item.detail}`
        : item.detail || item.text;

  return (
    <NextLink href={item.href} className="flex h-[84px] items-center gap-3 overflow-hidden rounded-card bg-surface px-3">
      <span className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden ${round ? 'rounded-full' : 'rounded-control'} ${item.thumbSrc || date ? 'bg-surface-2' : ICON_TINT[item.kind] ?? 'bg-surface-2'}`}>
        {item.thumbSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbSrc} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : date ? (
          <span className="flex h-full w-full flex-col items-center">
            <span className="w-full bg-danger py-0.5 text-center text-[10px] font-bold text-white uppercase">{date.toLocaleDateString('en-GB', { month: 'short' })}</span>
            <span className="flex flex-1 items-center text-title font-bold">{date.getDate()}</span>
          </span>
        ) : (
          <Icon className="text-[24px]" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-caption font-semibold tracking-wide text-text-secondary uppercase">{kindLabel}</span>
        <span className="block truncate text-body font-semibold">{title}</span>
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
