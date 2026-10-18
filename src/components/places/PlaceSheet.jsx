'use client';

import { useEffect, useRef, useState } from 'react';
import { Link, Preloader, Sheet, Toolbar } from 'konsta/react';
import { Camera, MapPin, Search } from 'framework7-icons/react';
import { Field, FieldGroup, TextInput } from '../FormRows';
import { useSession } from '../SessionProvider';
import { CATEGORIES, isMapsLink, placeFromMapsLink, savePlace, searchPlaces } from '@/lib/places';
import { errorMessage, supabase } from '@/lib/supabase';

function useUpcomingMeetings() {
  const [meetings, setMeetings] = useState([]);
  useEffect(() => {
    const now = new Date();
    const yearAhead = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    supabase
      .rpc('pair_events', { range_start: now.toISOString(), range_end: yearAhead.toISOString() })
      .then(({ data }) => setMeetings((data ?? []).filter((e) => e.type === 'meeting')));
  }, []);
  return meetings;
}

const meetingLabel = (m) =>
  `${m.title} · ${new Date(m.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;

/** Step 1 for new places: paste a Google Maps link or search by name. */
function Finder({ onPick }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const link = isMapsLink(query);

  useEffect(() => {
    if (link || query.trim().length < 3) return;
    const controller = new AbortController();
    // Nominatim asks for at most one request per second.
    const timer = setTimeout(() => {
      setLoading(true);
      searchPlaces(query.trim(), controller.signal)
        .then(setResults)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 700);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, link]);

  async function useLink() {
    setLoading(true);
    const place = await placeFromMapsLink(query.trim()).catch(() => null);
    setLoading(false);
    onPick(place ?? { maps_url: query.trim() });
  }

  return (
    <>
      <label className="mx-4 mt-2 flex h-10 items-center gap-2 rounded-control bg-surface-2 px-3">
        <Search className="text-[16px] text-text-secondary" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Google Maps link or place name"
          className="h-full min-w-0 flex-1 bg-transparent text-body outline-none"
        />
        {loading && <Preloader className="h-5! w-5!" />}
      </label>
      <ul className="mx-4 mt-3 space-y-2">
        {link ? (
          <li>
            <button type="button" onClick={useLink} className="flex h-12 w-full items-center justify-center gap-2 rounded-card bg-accent text-body font-semibold text-white">
              <MapPin className="text-[18px]" />
              Use this Google Maps link
            </button>
          </li>
        ) : (
          results.map((r) => (
            <li key={r.key}>
              <button type="button" onClick={() => onPick(r)} className="flex w-full items-center gap-3 rounded-card bg-surface p-3 text-start">
                <MapPin className="shrink-0 text-[20px] text-primary" />
                <span className="min-w-0">
                  <span className="block truncate text-body font-semibold">{r.title}</span>
                  <span className="block truncate text-subhead text-text-secondary">{r.subtitle}</span>
                </span>
              </button>
            </li>
          ))
        )}
        {!link && query.trim().length >= 2 && (
          <li>
            <button type="button" onClick={() => onPick({ title: query.trim() })} className="h-11 w-full rounded-card border border-dashed border-text-secondary/30 text-subhead text-primary">
              Add “{query.trim()}” by hand
            </button>
          </li>
        )}
      </ul>
    </>
  );
}

function PlaceForm({ place, onClose }) {
  const { me, pair } = useSession();
  const meetings = useUpcomingMeetings();
  const input = useRef(null);
  const [form, setForm] = useState(place);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(place.image_urlSrc ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function save() {
    setBusy(true);
    const { error } = await savePlace(form, { me, pair, image });
    if (error) {
      setError(errorMessage(error));
      setBusy(false);
    } else onClose(true);
  }

  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <Link toolbar onClick={() => onClose(false)}>
          Cancel
        </Link>
        <span className="text-body font-semibold">{place.id ? 'Edit place' : 'New place'}</span>
        <Link toolbar onClick={save} className={busy || !form.title?.trim() ? 'pointer-events-none opacity-40' : ''}>
          <b>{place.id ? 'Save' : 'Add'}</b>
        </Link>
      </Toolbar>
      <div className="max-h-[78vh] overflow-auto pb-safe-8">
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;
            setImage(file);
            setPreview(URL.createObjectURL(file));
          }}
        />
        <button type="button" onClick={() => input.current?.click()} className="mx-4 mt-2 flex aspect-[2/1] w-[calc(100%-2rem)] items-center justify-center overflow-hidden rounded-card bg-surface text-primary">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex items-center gap-2 text-subhead">
              <Camera className="text-[22px]" />
              Add photo
            </span>
          )}
        </button>

        <FieldGroup>
          <Field label="Name">
            <TextInput value={form.title ?? ''} placeholder="Required" onChange={set('title')} />
          </Field>
          <Field label="City">
            <TextInput value={form.city ?? ''} placeholder="Budapest" onChange={set('city')} />
          </Field>
        </FieldGroup>

        <div className="mx-4 mt-5 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setForm({ ...form, category: form.category === c.id ? null : c.id })}
              className={`h-9 rounded-full px-3 text-subhead ${form.category === c.id ? 'bg-accent text-white' : 'bg-surface'}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <FieldGroup title="Why I want to go">
          <li className="px-4 py-2">
            <textarea
              value={form.note ?? ''}
              onChange={set('note')}
              placeholder="The best pistachio croissant, apparently"
              rows={2}
              className="w-full resize-none bg-transparent text-body outline-none placeholder:text-text-secondary/50"
            />
          </li>
        </FieldGroup>

        {meetings.length > 0 && (
          <FieldGroup footer="The place shows up in that meeting in the calendar.">
            <Field label="For meeting">
              <select value={form.meeting_event_id ?? ''} onChange={set('meeting_event_id')} className="min-w-0 flex-1 bg-transparent text-end text-body text-text-secondary outline-none">
                <option value="">None</option>
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {meetingLabel(m)}
                  </option>
                ))}
              </select>
            </Field>
          </FieldGroup>
        )}
        {error && <p className="mx-8 mt-3 text-subhead text-danger">{error}</p>}
      </div>
    </>
  );
}

/** place = null → find a new place first; otherwise edit it. onClose(changed). */
export default function PlaceSheet({ opened, place, onClose }) {
  const [picked, setPicked] = useState(null);
  const current = place ?? picked;
  const close = (changed) => {
    setPicked(null);
    onClose(changed);
  };
  return (
    <Sheet opened={opened} onBackdropClick={() => close(false)} className="w-full">
      {opened &&
        (current ? (
          <PlaceForm place={current} onClose={close} />
        ) : (
          <>
            <Toolbar top innerClassName="w-full! items-center! justify-between">
              <span className="ps-2 text-body font-semibold">Add a place</span>
              <Link toolbar onClick={() => close(false)}>
                Cancel
              </Link>
            </Toolbar>
            <div className="h-[65vh] overflow-auto pb-safe-8">
              <Finder onPick={setPicked} />
            </div>
          </>
        ))}
    </Sheet>
  );
}
