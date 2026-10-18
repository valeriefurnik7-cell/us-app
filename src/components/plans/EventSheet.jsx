'use client';

import { useEffect, useState } from 'react';
import { Actions, ActionsButton, ActionsGroup, ActionsLabel, Link, Segmented, SegmentedButton, Sheet, Toggle, Toolbar } from 'konsta/react';
import { Field, FieldGroup, TextInput } from '../FormRows';
import DateRangePicker from '../DateRangePicker';
import ChangeRequests from '../ChangeRequests';
import { useSession } from '../SessionProvider';
import { EVENT_TYPES, deleteEvent, saveEvent } from '@/lib/events';
import { errorMessage, supabase } from '@/lib/supabase';

const pad = (n) => String(n).padStart(2, '0');
const toDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fromInputs = (date, time) => (date ? new Date(`${date}T${time || '00:00'}`) : null);

function initialForm(event, day) {
  const start = event ? new Date(event.start) : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12);
  const end = event?.end ? new Date(event.end) : null;
  return {
    title: event?.title ?? '',
    type: event?.type ?? 'busy', // a meeting is a deliberate choice — it drives the countdown on Home
    all_day: event?.all_day ?? true,
    startDate: toDateInput(start),
    startTime: toTimeInput(start),
    endDate: end ? toDateInput(end) : '',
    endTime: end ? toTimeInput(end) : '',
    city: event?.city ?? '',
    note: event?.note ?? '',
    is_private: event?.is_private ?? false,
  };
}

/** Places someone linked to this meeting from the Places tab. */
function MeetingPlaces({ eventId }) {
  const [places, setPlaces] = useState([]);
  useEffect(() => {
    supabase
      .from('places')
      .select('id, title, category, city')
      .eq('meeting_event_id', eventId)
      .then(({ data }) => setPlaces(data ?? []));
  }, [eventId]);
  if (!places.length) return null;
  return (
    <FieldGroup title="Places for this meeting">
      {places.map((p) => (
        <li key={p.id} className="flex min-h-12 items-center border-b border-text-secondary/20 px-4 text-body last:border-0">
          {p.title}
          {p.city && <span className="ms-auto text-subhead text-text-secondary">{p.city}</span>}
        </li>
      ))}
    </FieldGroup>
  );
}

function EventForm({ event, day, onClose }) {
  const { me, pair } = useSession();
  const [form, setForm] = useState(() => initialForm(event, day));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function save() {
    setBusy(true);
    setError(null);
    const start = fromInputs(form.startDate, form.all_day ? '' : form.startTime);
    // A timed plan without a last day ends the same day at "Until".
    const endDay = form.endDate || (!form.all_day && form.endTime ? form.startDate : '');
    const end = fromInputs(endDay, form.all_day ? '' : form.endTime);
    if (end && end < start) {
      setError('The end is before the start.');
      setBusy(false);
      return;
    }
    const { error } = await saveEvent(
      { id: event?.id, title: form.title, type: form.type, all_day: form.all_day, start: start.toISOString(), end: end?.toISOString(), city: form.city, note: form.note, is_private: form.is_private },
      { me, pair }
    );
    if (error) {
      setError(errorMessage(error));
      setBusy(false);
      return;
    }
    onClose(true);
  }

  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <Link toolbar onClick={() => onClose(false)}>
          Cancel
        </Link>
        <span className="text-body font-semibold">{event ? 'Edit event' : 'New event'}</span>
        <Link toolbar onClick={save} className={busy || !form.title.trim() ? 'pointer-events-none opacity-40' : ''}>
          <b>{event ? 'Save' : 'Add'}</b>
        </Link>
      </Toolbar>

      <div className="max-h-[78vh] overflow-auto pb-safe-8">
        <div className="mx-4 mt-3">
          <Segmented strong rounded>
            {EVENT_TYPES.map((t) => (
              <SegmentedButton key={t.id} strong rounded small active={form.type === t.id} onClick={() => setForm({ ...form, type: t.id })}>
                {t.label}
              </SegmentedButton>
            ))}
          </Segmented>
        </div>

        <FieldGroup>
          <Field label="Title">
            <TextInput value={form.title} placeholder={form.type === 'meeting' ? 'Weekend in Budapest' : 'Required'} onChange={set('title')} />
          </Field>
          <Field label="City">
            <TextInput value={form.city} placeholder="Optional" onChange={set('city')} />
          </Field>
        </FieldGroup>

        {/* Tap one day for a one-day plan, or the first and last day for a period */}
        <div className="mx-4 mt-4">
          <DateRangePicker
            value={{ start: form.startDate, end: form.endDate === form.startDate ? '' : form.endDate }}
            onChange={({ start, end }) => setForm((f) => ({ ...f, startDate: start, endDate: end }))}
          />
        </div>

        <FieldGroup>
          <Field label="All day">
            <span className="flex flex-1 justify-end">
              <Toggle checked={form.all_day} onChange={() => setForm({ ...form, all_day: !form.all_day })} />
            </span>
          </Field>
          {!form.all_day && (
            <>
              <Field label="From">
                <TextInput type="time" value={form.startTime} onChange={set('startTime')} />
              </Field>
              <Field label="Until">
                <TextInput type="time" value={form.endTime} onChange={set('endTime')} />
              </Field>
            </>
          )}
        </FieldGroup>

        <FieldGroup footer={form.is_private ? 'Your friend sees only “Busy” and the dates.' : 'Your friend sees everything.'}>
          <Field label="Only me">
            <span className="flex flex-1 justify-end">
              <Toggle checked={form.is_private} onChange={() => setForm({ ...form, is_private: !form.is_private })} />
            </span>
          </Field>
        </FieldGroup>

        <FieldGroup>
          <li className="px-4 py-2">
            <textarea
              value={form.note}
              onChange={set('note')}
              placeholder="Note"
              rows={3}
              className="w-full resize-none bg-transparent text-body outline-none placeholder:text-text-secondary/50"
            />
          </li>
        </FieldGroup>

        {event?.type === 'meeting' && <MeetingPlaces eventId={event.id} />}

        {error && <p className="mx-8 mt-3 text-subhead text-danger">{error}</p>}

        {event && (
          <button type="button" onClick={() => setConfirmDelete(true)} className="mx-4 mt-6 h-12 w-[calc(100%-2rem)] rounded-card bg-surface text-body text-danger">
            Delete event
          </button>
        )}
      </div>

      <Actions opened={confirmDelete} onBackdropClick={() => setConfirmDelete(false)}>
        <ActionsGroup>
          <ActionsLabel>Delete “{event?.title}” for both of you?</ActionsLabel>
          <ActionsButton
            className="text-danger!"
            onClick={async () => {
              setConfirmDelete(false);
              await deleteEvent(event.id);
              onClose(true);
            }}
          >
            Delete
          </ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton bold onClick={() => setConfirmDelete(false)}>
            Cancel
          </ActionsButton>
        </ActionsGroup>
      </Actions>
    </>
  );
}

/** Her own plan (not a shared meeting): I can read it and suggest a change, not edit it. */
function EventView({ event, onClose }) {
  const { partner } = useSession();
  const type = EVENT_TYPES.find((t) => t.id === event.type)?.label;
  const fmt = (d) =>
    new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', ...(event.all_day ? {} : { hour: '2-digit', minute: '2-digit' }) });
  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <span className="ps-2 text-subhead text-text-secondary">{partner?.name}’s plan</span>
        <Link toolbar onClick={() => onClose(false)}>
          <b>Done</b>
        </Link>
      </Toolbar>
      <div className="max-h-[78vh] overflow-auto px-0 pb-safe-8">
        <div className="px-4">
          <p className="text-title font-bold">{event.title}</p>
          <p className="mt-1 text-subhead text-text-secondary">{[type, event.city].filter(Boolean).join(' · ')}</p>
          <p className="mt-3 text-body">
            {fmt(event.start)}
            {event.end && ` – ${fmt(event.end)}`}
          </p>
          {event.note && <p className="mt-3 rounded-card bg-surface p-3 text-body">{event.note}</p>}
        </div>
        <ChangeRequests kind="event" targetId={event.id} ownerId={event.author_id} />
      </div>
    </>
  );
}

/** New event (event = null) on `day`, or edit an existing one. onClose(changed). */
export default function EventSheet({ opened, event, day, onClose }) {
  const { me } = useSession();
  // Her plans are hers; a meeting belongs to both of us.
  const readOnly = Boolean(event && event.author_id !== me.id && event.type !== 'meeting');
  return (
    <Sheet opened={opened} onBackdropClick={() => onClose(false)} className="w-full">
      {opened && (readOnly ? <EventView event={event} onClose={onClose} /> : <EventForm event={event} day={day} onClose={onClose} />)}
    </Sheet>
  );
}
