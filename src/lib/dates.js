const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function timeAgo(iso) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const steps = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.35, 'week'],
    [12, 'month'],
    [Infinity, 'year'],
  ];
  let value = seconds;
  for (const [size, unit] of steps) {
    if (Math.abs(value) < size) return unit === 'second' ? 'just now' : rtf.format(Math.round(value), unit);
    value /= size;
  }
}

/** "3 y 2 mo" from a yyyy-mm-dd birthday. */
export function ageFrom(birthday) {
  if (!birthday) return null;
  const b = new Date(`${birthday}T00:00:00`);
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + now.getMonth() - b.getMonth();
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) return null;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y && `${y} y`, m && `${m} mo`].filter(Boolean).join(' ') || 'newborn';
}

/** Local calendar day key, e.g. "2026-10-18". */
export const dayKey = (d) => {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/** Consecutive days with activity, counting back from today (or yesterday if today is still empty). */
export function streak(daySet) {
  const d = new Date();
  if (!daySet.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let count = 0;
  while (daySet.has(dayKey(d))) {
    count += 1;
    d.setDate(d.getDate() - 1);
  }
  return count;
}
