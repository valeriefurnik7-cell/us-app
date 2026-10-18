'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Chip, Segmented, SegmentedButton } from 'konsta/react';
import { CalendarBadgePlus, ChevronLeft, ChevronRight, LockFill } from 'framework7-icons/react';
import Screen from '@/components/Screen';
import { AppNavbar } from '@/components/AppNavbar';
import Avatar from '@/components/Avatar';
import { useSession } from '@/components/SessionProvider';
import EventSheet from '@/components/plans/EventSheet';
import TripsTab from '@/components/plans/TripsTab';
import PlacesView from '@/components/places/PlacesView';
import { FILTERS, EVENT_TYPES, addDays, colorOf, matchesFilter, onDay, sameDay, startOfDay, startOfWeek, useEvents } from '@/lib/events';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function visibleRange(view, cursor) {
  if (view === 'week') {
    const from = startOfWeek(cursor);
    return { from, days: 7 };
  }
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const from = startOfWeek(first);
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const days = Math.ceil((startOfDay(addDays(last, 1)) - from) / 864e5 / 7) * 7;
  return { from, days };
}

function timeLabel(event) {
  if (event.all_day) {
    if (!event.end || sameDay(new Date(event.start), new Date(event.end))) return 'All day';
    const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${fmt(event.start)} – ${fmt(event.end)}`;
  }
  const t = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return event.end ? `${t(event.start)} – ${t(event.end)}` : t(event.start);
}

function EventRow({ event, onOpen }) {
  const { me, partner } = useSession();
  const mine = event.author_id === me.id;
  const author = mine ? me : partner;
  const type = EVENT_TYPES.find((t) => t.id === event.type)?.label;
  // Trips open their own page; quick marks and birthdays aren't edited from the calendar.
  const editable = !event.masked && !event.birthday && event.source !== 'quick_trip';
  return (
    <button
      type="button"
      disabled={!editable}
      onClick={() => onOpen(event)}
      className="flex w-full items-center gap-3 rounded-card bg-surface p-3 text-start"
    >
      <span className={`w-1 self-stretch rounded-full ${colorOf(event, me.id)}`} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 truncate text-body font-semibold">
          {event.title}
          {event.is_private && mine && <LockFill className="shrink-0 text-[13px] text-text-secondary" />}
        </span>
        <span className="block truncate text-subhead text-text-secondary">
          {[timeLabel(event), event.city, !event.masked && type].filter(Boolean).join(' · ')}
        </span>
      </span>
      <Avatar who={mine ? 'me' : 'her'} name={author?.name} src={author?.avatar} />
    </button>
  );
}

const SEGMENT_KEY = 'plansSegment';

function readSegment() {
  try {
    // ?tab=trips (e.g. from the Trips counter on Home) wins over the remembered tab.
    const fromLink = new URLSearchParams(window.location.search).get('tab');
    if (['trips', 'calendar', 'places'].includes(fromLink)) return fromLink;
    return sessionStorage.getItem(SEGMENT_KEY) || 'calendar';
  } catch {
    return 'calendar';
  }
}

export default function PlansPage() {
  const { me, partner } = useSession();
  const router = useRouter();
  // The app renders after sign-in on the client, so sessionStorage is available here.
  const [segment, setSegmentState] = useState(readSegment);
  const [tripAdding, setTripAdding] = useState(false);
  const [placeAdding, setPlaceAdding] = useState(false);
  const setSegment = (next) => {
    setSegmentState(next);
    try {
      sessionStorage.setItem(SEGMENT_KEY, next);
    } catch {}
  };
  const [view, setView] = useState('month');
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null); // { event } | null

  const { from, days } = visibleRange(view, cursor);
  const to = addDays(from, days);
  const events = useEvents(from, to, [me, partner]);
  const visible = (events.data ?? []).filter((e) => matchesFilter(e, filter, me.id));
  const dayEvents = visible.filter((e) => onDay(e, selected));
  const today = startOfDay(new Date());

  function shift(dir) {
    const next = view === 'week' ? addDays(cursor, 7 * dir) : new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1);
    setCursor(next);
    setSelected(view === 'week' ? addDays(selected, 7 * dir) : next);
  }

  const title = (view === 'week' ? from : cursor).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <Screen>
      <AppNavbar
        title="Plans"
        onAdd={segment === 'calendar' ? () => setEditing({ event: null }) : segment === 'trips' ? () => setTripAdding(true) : () => setPlaceAdding(true)}
        addIcon={segment === 'calendar' ? CalendarBadgePlus : undefined}
      />

      <div className="mx-4 mt-2">
        <Segmented strong rounded>
          <SegmentedButton strong rounded active={segment === 'calendar'} onClick={() => setSegment('calendar')}>
            Calendar
          </SegmentedButton>
          <SegmentedButton strong rounded active={segment === 'trips'} onClick={() => setSegment('trips')}>
            Trips
          </SegmentedButton>
          <SegmentedButton strong rounded active={segment === 'places'} onClick={() => setSegment('places')}>
            Places
          </SegmentedButton>
        </Segmented>
      </div>

      {segment === 'places' ? (
        <PlacesView adding={placeAdding} onAddClose={() => setPlaceAdding(false)} />
      ) : segment === 'trips' ? (
        <TripsTab adding={tripAdding} onAddClose={setTripAdding} />
      ) : (
        <>
          <div className="mx-4 mt-3 rounded-card bg-surface p-3">
            {/* Header: month + arrows + month/week */}
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Previous" onClick={() => shift(-1)} className="flex h-11 w-11 items-center justify-center text-primary">
                <ChevronLeft className="text-[20px]" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setCursor(today);
                  setSelected(today);
                }}
                className="flex-1 text-center text-body font-semibold"
              >
                {title}
              </button>
              <button type="button" aria-label="Next" onClick={() => shift(1)} className="flex h-11 w-11 items-center justify-center text-primary">
                <ChevronRight className="text-[20px]" />
              </button>
            </div>
            <div className="mx-auto mt-1 w-44">
              <Segmented rounded>
                {['month', 'week'].map((v) => (
                  <SegmentedButton key={v} rounded small active={view === v} onClick={() => setView(v)}>
                    {v === 'month' ? 'Month' : 'Week'}
                  </SegmentedButton>
                ))}
              </Segmented>
            </div>

            {/* Grid */}
            <div className="mt-3 grid grid-cols-7 text-center">
              {WEEKDAYS.map((d) => (
                <span key={d} className="pb-1 text-caption font-semibold text-text-secondary">
                  {d}
                </span>
              ))}
              {Array.from({ length: days }, (_, i) => {
                const day = addDays(from, i);
                const inMonth = view === 'week' || day.getMonth() === cursor.getMonth();
                const isToday = sameDay(day, today);
                const isSelected = sameDay(day, selected);
                const marks = visible.filter((e) => onDay(e, day)).slice(0, 3);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setSelected(day)}
                    className={`flex h-12 flex-col items-center justify-start gap-1 pt-1 ${inMonth ? '' : 'opacity-35'}`}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-subhead ${
                        isSelected ? 'bg-accent font-semibold text-white' : isToday ? 'font-bold text-primary' : ''
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    <span className="flex gap-0.5">
                      {marks.map((e) => (
                        <span key={e.id} className={`h-1 w-2.5 rounded-full ${colorOf(e, me.id)}`} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
            {FILTERS.map((f) => (
              <Chip
                key={f.id}
                component="button"
                onClick={() => setFilter(f.id)}
                className={`h-9 shrink-0 px-3 ${filter === f.id ? 'bg-accent! text-white!' : ''}`}
              >
                {f.label}
              </Chip>
            ))}
          </div>

          {/* Selected day */}
          <p className="mx-8 mt-5 mb-2 text-caption font-semibold tracking-wide text-text-secondary uppercase">
            {selected.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {events.loading ? (
            <div className="mx-4 h-16 animate-pulse rounded-card bg-surface" />
          ) : dayEvents.length === 0 ? (
            <button
              type="button"
              onClick={() => setEditing({ event: null })}
              className="mx-4 flex h-16 w-[calc(100%-2rem)] items-center justify-center rounded-card border-2 border-dashed border-text-secondary/25 text-subhead text-primary"
            >
              + Add a plan for this day
            </button>
          ) : (
            <div className="mx-4 space-y-2">
              {dayEvents.map((e) => (
                <EventRow
                  key={e.id}
                  event={e}
                  onOpen={(event) => (event.source === 'trip' ? router.push(`/plans/trips/${event.id}`) : setEditing({ event }))}
                />
              ))}
            </div>
          )}

          <div className="mx-8 mt-4 flex flex-wrap gap-x-4 gap-y-1 text-caption text-text-secondary">
            <span className="flex items-center gap-1.5"><span className="h-1 w-2.5 rounded-full bg-me" />Me</span>
            <span className="flex items-center gap-1.5"><span className="h-1 w-2.5 rounded-full bg-her" />{partner?.name ?? 'Her'}</span>
            <span className="flex items-center gap-1.5"><span className="h-1 w-2.5 rounded-full bg-together" />Together</span>
          </div>
        </>
      )}

      <EventSheet
        opened={Boolean(editing)}
        event={editing?.event ?? null}
        day={selected}
        onClose={(changed) => {
          setEditing(null);
          if (changed) events.reload();
        }}
      />
    </Screen>
  );
}
