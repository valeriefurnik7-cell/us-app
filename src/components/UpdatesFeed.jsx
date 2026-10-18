'use client';

import NextLink from '@/components/AppLink';
import { ChevronRight } from 'framework7-icons/react';
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

function UpdateRow({ item }) {
  const { me, partner } = useSession();
  const mine = item.actor_id === me.id;
  const who = mine ? me : partner;
  return (
    <NextLink href={item.href} className="flex min-h-16 items-center gap-3 border-b border-text-secondary/15 px-3 py-2.5 last:border-0">
      <Avatar who={mine ? 'me' : 'her'} name={who?.name} src={who?.avatar} />
      <span className="min-w-0 flex-1">
        <span className="block text-body leading-snug">
          <b className="font-semibold">{mine ? 'You' : who?.name}</b> {item.text}
        </span>
        {item.detail && <span className="block truncate text-subhead text-text-secondary">{item.detail}</span>}
        <span className="text-caption text-text-secondary">{timeAgo(item.created_at)}</span>
      </span>
      {item.thumbSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.thumbSrc} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-control object-cover" />
      ) : (
        <ChevronRight className="shrink-0 text-[14px] text-text-secondary/60" />
      )}
    </NextLink>
  );
}

/** Updates from both of you; grouped by day when `grouped`. */
export default function UpdatesFeed({ items, loading, grouped = false, empty }) {
  if (loading) {
    return (
      <div className="mx-4 space-y-px overflow-hidden rounded-card">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse bg-surface" />
        ))}
      </div>
    );
  }
  if (!items.length) return <p className="mx-4 rounded-card bg-surface px-4 py-6 text-center text-subhead text-text-secondary">{empty}</p>;
  if (!grouped) {
    return (
      <ul className="mx-4 overflow-hidden rounded-card bg-surface">
        {items.map((i) => (
          <li key={i.id}>
            <UpdateRow item={i} />
          </li>
        ))}
      </ul>
    );
  }
  const days = items.reduce((acc, i) => {
    const key = dayKey(i.created_at);
    (acc[key] ??= []).push(i);
    return acc;
  }, {});
  return Object.values(days).map((list) => (
    <section key={dayKey(list[0].created_at)}>
      <h3 className="mx-8 mt-5 mb-1.5 text-caption font-semibold tracking-wide text-text-secondary uppercase">{dayLabel(list[0].created_at)}</h3>
      <ul className="mx-4 overflow-hidden rounded-card bg-surface">
        {list.map((i) => (
          <li key={i.id}>
            <UpdateRow item={i} />
          </li>
        ))}
      </ul>
    </section>
  ));
}
