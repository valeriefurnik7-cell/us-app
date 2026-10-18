'use client';

import { useCallback } from 'react';
import { supabase } from './supabase';
import { useLive } from './useLive';

export const EVENT_TYPES = [
  { id: 'meeting', label: 'Meeting' },
  { id: 'trip', label: 'Trip' },
  { id: 'busy', label: 'Busy' },
  { id: 'important', label: 'Important' },
];

export const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'Mine' },
  { id: 'hers', label: 'Hers' },
  { id: 'meeting', label: 'Meetings' },
  { id: 'trip', label: 'Trips' },
];

/** Meetings are shared (together color); everything else is colored by who added it. */
export function colorOf(event, meId) {
  if (event.type === 'meeting') return 'bg-together';
  return event.author_id === meId ? 'bg-me' : 'bg-her';
}

export function matchesFilter(event, filter, meId) {
  if (filter === 'mine') return event.author_id === meId;
  if (filter === 'hers') return event.author_id !== meId;
  if (filter === 'meeting' || filter === 'trip') return event.type === filter;
  return true;
}

export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

/** Monday-based week start. */
export const startOfWeek = (d) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));

export function onDay(event, day) {
  const from = startOfDay(day);
  const to = addDays(from, 1);
  const start = new Date(event.start);
  const end = event.end ? new Date(event.end) : start;
  return start < to && end >= from;
}

const TABLES = ['events'];

/** Events in [from, to) — the partner's private ones arrive masked as "Busy". Birthdays are added as "Important". */
export function useEvents(from, to, profiles) {
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const birthdays = profiles
    .filter((p) => p?.birthday)
    .map((p) => `${p.id}|${p.name}|${p.birthday}`)
    .join(',');

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('pair_events', { range_start: fromIso, range_end: toIso });
    const events = data ?? [];
    // Birthdays repeat every year, so they're generated for the visible range instead of stored.
    const fromDate = new Date(fromIso);
    const toDate = new Date(toIso);
    birthdays
      .split(',')
      .filter(Boolean)
      .forEach((entry) => {
        const [id, name, date] = entry.split('|');
        const [, m, d] = date.split('-').map(Number);
        for (let y = fromDate.getFullYear(); y <= toDate.getFullYear(); y += 1) {
          const day = new Date(y, m - 1, d);
          if (day >= fromDate && day < toDate) {
            events.push({ id: `bday-${id}-${y}`, author_id: id, title: `${name}’s birthday`, type: 'important', start: day.toISOString(), end: null, all_day: true, birthday: true });
          }
        }
      });
    return events.sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [fromIso, toIso, birthdays]);

  return useLive(load, TABLES);
}

export async function saveEvent(event, { me, pair }) {
  const row = {
    title: event.title.trim(),
    type: event.type,
    start: event.start,
    end: event.end || null,
    all_day: event.all_day,
    city: event.city?.trim() || null,
    note: event.note?.trim() || null,
    is_private: event.is_private,
  };
  if (event.id) return supabase.from('events').update(row).eq('id', event.id);
  const result = await supabase.from('events').insert({ ...row, pair_id: pair.id, author_id: me.id }).select().single();
  if (!result.error && !row.is_private) {
    await supabase.from('activity').insert({ pair_id: pair.id, actor_id: me.id, kind: 'event', target_id: result.data.id });
  }
  return result;
}

export const deleteEvent = (id) => supabase.from('events').delete().eq('id', id);
