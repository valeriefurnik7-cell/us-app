'use client';

import { useState } from 'react';
import { SquareArrowUp } from 'framework7-icons/react';
import { renderTrophyCard, sentLine, winnerDate } from '@/lib/petOfDay';

/** A little trophy cup. */
export function Trophy({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M7 3h10v2h3a1 1 0 0 1 1 1v1.5A4.5 4.5 0 0 1 16.9 12 5 5 0 0 1 13 14.9V17h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h3v-2.1A5 5 0 0 1 7.1 12 4.5 4.5 0 0 1 3 7.5V6a1 1 0 0 1 1-1h3V3Zm10 4v2.86A2.5 2.5 0 0 0 19 7.5V7h-2ZM5 7v.5a2.5 2.5 0 0 0 2 2.36V7H5Z" />
    </svg>
  );
}

async function save(winner) {
  const blob = await renderTrophyCard(winner);
  const file = new File([blob], `pet-of-the-day-${winner.day}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] }).catch(() => {});
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** The winner in a gold frame: photo, trophy, "Pet of the day", name and date. */
export default function TrophyCard({ winner, compact = false }) {
  const [saving, setSaving] = useState(false);
  return (
    <div className="rounded-[24px] bg-gradient-to-br from-[#F7D774] via-[#D9A21B] to-[#F5C451] p-1.5 shadow-lg">
      <div className="relative overflow-hidden rounded-[19px] bg-black">
        {winner.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={winner.src} alt="" className={`w-full object-cover ${compact ? 'aspect-[4/3]' : 'aspect-[4/5]'}`} />
        ) : (
          <div className={compact ? 'aspect-[4/3]' : 'aspect-[4/5]'} />
        )}
        <span className="absolute start-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 py-1.5 ps-2 pe-3 text-white backdrop-blur-md">
          <Trophy className="h-5 w-5 text-[#F5C451]" />
          <span className="text-caption font-extrabold tracking-wider">PET OF THE DAY</span>
        </span>
        {!compact && (
          <button
            type="button"
            aria-label="Save"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await save(winner);
              setSaving(false);
            }}
            className="absolute end-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md disabled:opacity-50"
          >
            <SquareArrowUp className="text-[18px]" />
          </button>
        )}
      </div>
      <div className="px-3 pt-2 pb-2.5 text-[#1A1300]">
        <p className={`${compact ? 'text-title' : 'text-[30px]'} leading-tight font-extrabold`}>{winner.name}</p>
        <p className="text-subhead font-semibold opacity-70">{winnerDate(winner.day)}</p>
        {sentLine(winner) && <p className="text-caption font-medium opacity-60">{sentLine(winner)}</p>}
      </div>
    </div>
  );
}
