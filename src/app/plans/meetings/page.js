'use client';

import { useCallback, useState } from 'react';
import Screen, { EmptyState } from '@/components/Screen';
import { InnerNavbar } from '@/components/AppNavbar';
import EventSheet from '@/components/plans/EventSheet';
import { supabase } from '@/lib/supabase';
import { useLive } from '@/lib/useLive';
import { startOfDay } from '@/lib/events';

const TABLES = ['events'];

function range(e) {
  const fmt = (d, y) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(y ? { year: 'numeric' } : {}) });
  return e.end && startOfDay(new Date(e.end)) > startOfDay(new Date(e.start)) ? `${fmt(e.start)} – ${fmt(e.end, true)}` : fmt(e.start, true);
}

function MeetingRow({ meeting, onOpen, past }) {
  const days = Math.round((startOfDay(new Date(meeting.start)) - startOfDay(new Date())) / 864e5);
  return (
    <li>
      <button type="button" onClick={() => onOpen(meeting)} className="flex min-h-16 w-full items-center gap-3 border-b border-text-secondary/15 px-4 py-2.5 text-start">
        <span className={`w-1 self-stretch rounded-full ${past ? 'bg-text-secondary/30' : 'bg-together'}`} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-semibold">{meeting.city || meeting.title}</span>
          <span className="block truncate text-subhead text-text-secondary">{[range(meeting), meeting.city && meeting.title].filter(Boolean).join(' · ')}</span>
        </span>
        {!past && <span className="shrink-0 text-subhead font-semibold text-together">{days <= 0 ? 'Now' : `in ${days} d`}</span>}
      </button>
    </li>
  );
}

/** Every meeting, upcoming first — opened from the Meetings counter on Home. */
export default function MeetingsPage() {
  const [editing, setEditing] = useState(null);
  const load = useCallback(async () => {
    const now = new Date();
    const { data } = await supabase.rpc('pair_events', {
      range_start: new Date(now.getFullYear() - 10, 0, 1).toISOString(),
      range_end: new Date(now.getFullYear() + 5, 0, 1).toISOString(),
    });
    return (data ?? []).filter((e) => e.type === 'meeting');
  }, []);
  const { data, loading, reload } = useLive(load, TABLES);

  const today = startOfDay(new Date());
  const all = data ?? [];
  const upcoming = all.filter((e) => startOfDay(new Date(e.end ?? e.start)) >= today);
  const past = all.filter((e) => startOfDay(new Date(e.end ?? e.start)) < today).reverse();

  return (
    <Screen>
      <InnerNavbar title="Meetings" />
      {loading ? (
        <div className="mx-4 h-32 animate-pulse rounded-card bg-surface" />
      ) : all.length === 0 ? (
        <EmptyState title="No meetings yet" text="Add one in Plans → Calendar with the type “Meeting”" />
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <h3 className="mx-8 mt-2 mb-1.5 text-caption font-semibold tracking-wide text-text-secondary uppercase">Coming up</h3>
              <ul className="mx-4 overflow-hidden rounded-card bg-surface">
                {upcoming.map((m) => (
                  <MeetingRow key={m.id} meeting={m} onOpen={setEditing} />
                ))}
              </ul>
            </>
          )}
          {past.length > 0 && (
            <>
              <h3 className="mx-8 mt-6 mb-1.5 text-caption font-semibold tracking-wide text-text-secondary uppercase">We met · {past.length}</h3>
              <ul className="mx-4 overflow-hidden rounded-card bg-surface">
                {past.map((m) => (
                  <MeetingRow key={m.id} meeting={m} onOpen={setEditing} past />
                ))}
              </ul>
            </>
          )}
        </>
      )}
      <EventSheet
        opened={Boolean(editing)}
        event={editing}
        day={editing ? new Date(editing.start) : new Date()}
        onClose={(changed) => {
          setEditing(null);
          if (changed) reload();
        }}
      />
    </Screen>
  );
}
