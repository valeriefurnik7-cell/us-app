'use client';

import { useState } from 'react';
import { Toggle } from 'konsta/react';
import { ChevronLeft, ChevronRight } from 'framework7-icons/react';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const pad = (n) => String(n).padStart(2, '0');
const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromYmd = (s) => (s ? new Date(`${s}T00:00:00`) : null);
const nice = (s) => fromYmd(s)?.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/**
 * One calendar for a period: tap the first day, then the last. Third tap starts over.
 * value: { start: 'yyyy-mm-dd' | '', end: 'yyyy-mm-dd' | '' }; `openEnded` allows "no end date".
 */
export default function DateRangePicker({ value, onChange, openEnded = false }) {
  const start = fromYmd(value.start);
  const end = fromYmd(value.end);
  const [noEnd, setNoEnd] = useState(Boolean(openEnded && value.start && !value.end && value.noEnd));
  const [cursor, setCursor] = useState(() => {
    const base = start ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: offset + daysInMonth }, (_, i) => (i < offset ? null : new Date(cursor.getFullYear(), cursor.getMonth(), i - offset + 1)));
  const today = toYmd(new Date());

  function pick(day) {
    const ymd = toYmd(day);
    if (!start || noEnd || (start && end)) {
      onChange({ start: ymd, end: '', noEnd });
    } else if (day < start) {
      onChange({ start: ymd, end: value.start, noEnd: false });
    } else {
      onChange({ start: value.start, end: ymd, noEnd: false });
    }
  }

  const summary = !start
    ? 'Tap the first day'
    : noEnd
      ? `From ${nice(value.start)} · no end date`
      : !end
        ? `${nice(value.start)} → tap the last day`
        : value.start === value.end
          ? nice(value.start)
          : `${nice(value.start)} – ${nice(value.end)}`;

  return (
    <div className="rounded-card bg-surface p-3">
      <p className="px-1 pb-2 text-subhead font-semibold text-primary">{summary}</p>

      <div className="flex items-center">
        <button type="button" aria-label="Previous month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="flex h-10 w-10 items-center justify-center text-primary">
          <ChevronLeft className="text-[18px]" />
        </button>
        <span className="flex-1 text-center text-body font-semibold">{cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
        <button type="button" aria-label="Next month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="flex h-10 w-10 items-center justify-center text-primary">
          <ChevronRight className="text-[18px]" />
        </button>
      </div>

      <div className="mt-1 grid grid-cols-7 text-center">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="pb-1 text-caption font-semibold text-text-secondary">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={i} />;
          const ymd = toYmd(day);
          const isStart = ymd === value.start;
          const isEnd = ymd === value.end;
          const inRange = start && end && day > start && day < end;
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(day)}
              className={`relative flex h-10 items-center justify-center text-subhead ${inRange ? 'bg-accent/15' : ''} ${
                isStart && end ? 'rounded-s-full bg-accent/15' : ''
              } ${isEnd && start ? 'rounded-e-full bg-accent/15' : ''}`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  isStart || isEnd ? 'bg-accent font-semibold text-white' : ymd === today ? 'font-bold text-primary' : ''
                }`}
              >
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {openEnded && (
        <button
          type="button"
          onClick={() => {
            const next = !noEnd;
            setNoEnd(next);
            onChange({ start: value.start, end: next ? '' : value.end, noEnd: next });
          }}
          className="mt-2 flex min-h-11 w-full items-center gap-3 border-t border-text-secondary/15 px-1 pt-2 text-start"
        >
          <span className="flex-1">
            <span className="block text-body">No end date</span>
            <span className="block text-caption text-text-secondary">For a stay that isn’t over yet</span>
          </span>
          <span className="pointer-events-none">
            <Toggle component="span" checked={noEnd} readOnly />
          </span>
        </button>
      )}
    </div>
  );
}
