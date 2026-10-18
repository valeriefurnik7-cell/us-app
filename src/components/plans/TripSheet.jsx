'use client';

import { useRef, useState } from 'react';
import { Link, Segmented, SegmentedButton, Sheet, Toggle, Toolbar } from 'konsta/react';
import { Camera } from 'framework7-icons/react';
import { Field, FieldGroup, TextInput } from '../FormRows';
import { useSession } from '../SessionProvider';
import { TRIP_STATUSES, addQuickTrip, saveTrip } from '@/lib/trips';
import { errorMessage } from '@/lib/supabase';

function TripForm({ trip, onClose }) {
  const { me, pair } = useSession();
  const input = useRef(null);
  const [form, setForm] = useState({
    destination: trip?.destination ?? '',
    status: trip?.status ?? 'planned',
    start: trip?.start ?? '',
    end: trip?.end ?? '',
    shared: trip?.shared ?? true,
  });
  const [cover, setCover] = useState(null);
  const [preview, setPreview] = useState(trip?.cover_urlSrc ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function save() {
    setBusy(true);
    const { data, error } = await saveTrip({ ...trip, ...form }, { me, pair, cover });
    if (error) {
      setError(errorMessage(error));
      setBusy(false);
    } else onClose(true, data);
  }

  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <Link toolbar onClick={() => onClose(false)}>
          Cancel
        </Link>
        <span className="text-body font-semibold">{trip ? 'Edit trip' : 'New destination'}</span>
        <Link toolbar onClick={save} className={busy || !form.destination.trim() ? 'pointer-events-none opacity-40' : ''}>
          <b>{trip ? 'Save' : 'Add'}</b>
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
            setCover(file);
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
              Add cover
            </span>
          )}
        </button>

        <FieldGroup>
          <Field label="Where">
            <TextInput value={form.destination} placeholder="Milan" onChange={set('destination')} />
          </Field>
          <Field label="From">
            <TextInput type="date" value={form.start} onChange={set('start')} />
          </Field>
          <Field label="To">
            <TextInput type="date" value={form.end} onChange={set('end')} />
          </Field>
        </FieldGroup>

        <div className="mx-4 mt-6">
          <Segmented strong rounded>
            {TRIP_STATUSES.map((s) => (
              <SegmentedButton key={s.id} strong rounded active={form.status === s.id} onClick={() => setForm({ ...form, status: s.id })}>
                {s.label}
              </SegmentedButton>
            ))}
          </Segmented>
        </div>

        <FieldGroup footer={form.shared ? 'We’re going together.' : 'Your own trip — it still shows in the calendar.'}>
          <Field label="Together">
            <span className="flex flex-1 justify-end">
              <Toggle checked={form.shared} onChange={() => setForm({ ...form, shared: !form.shared })} />
            </span>
          </Field>
        </FieldGroup>
        {error && <p className="mx-8 mt-3 text-subhead text-danger">{error}</p>}
      </div>
    </>
  );
}

/** onClose(changed, savedTrip) */
export default function TripSheet({ opened, trip, onClose }) {
  return (
    <Sheet opened={opened} onBackdropClick={() => onClose(false)} className="w-full">
      {opened && <TripForm trip={trip} onClose={onClose} />}
    </Sheet>
  );
}

function QuickForm({ onClose }) {
  const { me, pair } = useSession();
  const [form, setForm] = useState({ city: '', start: '', end: '' });
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <Link toolbar onClick={() => onClose(false)}>
          Cancel
        </Link>
        <span className="text-body font-semibold">Where I was</span>
        <Link
          toolbar
          className={busy || !form.city.trim() ? 'pointer-events-none opacity-40' : ''}
          onClick={async () => {
            setBusy(true);
            await addQuickTrip(form, { me, pair });
            onClose(true);
          }}
        >
          <b>Add</b>
        </Link>
      </Toolbar>
      <div className="pb-safe-8">
        <FieldGroup footer="A quick mark without planning — it shows in the calendar.">
          <Field label="City">
            <TextInput value={form.city} placeholder="Prague" onChange={set('city')} />
          </Field>
          <Field label="From">
            <TextInput type="date" value={form.start} onChange={set('start')} />
          </Field>
          <Field label="To">
            <TextInput type="date" value={form.end} onChange={set('end')} />
          </Field>
        </FieldGroup>
      </div>
    </>
  );
}

export function QuickTripSheet({ opened, onClose }) {
  return (
    <Sheet opened={opened} onBackdropClick={() => onClose(false)} className="w-full">
      {opened && <QuickForm onClose={onClose} />}
    </Sheet>
  );
}
