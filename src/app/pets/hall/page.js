'use client';

import { useState } from 'react';
import { Sheet } from 'konsta/react';
import Screen, { EmptyState } from '@/components/Screen';
import { InnerNavbar } from '@/components/AppNavbar';
import TrophyCard, { Trophy } from '@/components/pets/TrophyCard';
import { usePetsOfDay, winnerDate } from '@/lib/petOfDay';

/** Every Pet of the day so far. */
export default function HallOfFamePage() {
  const winners = usePetsOfDay();
  const [open, setOpen] = useState(null);
  const list = winners.data ?? [];
  const tally = Object.entries(list.reduce((acc, w) => ({ ...acc, [w.name]: (acc[w.name] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);

  return (
    <Screen>
      <InnerNavbar title="Hall of fame" />
      {winners.loading ? (
        <div className="mx-4 aspect-[4/5] animate-pulse rounded-[24px] bg-surface" />
      ) : list.length === 0 ? (
        <EmptyState title="No winners yet" text="Send pet photos during the day — at 22:00 one of them becomes Pet of the day" />
      ) : (
        <>
          <div className="mx-4">
            <TrophyCard winner={list[0]} />
          </div>

          {tally.length > 1 && (
            <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-4">
              {tally.map(([name, wins]) => (
                <span key={name} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 text-subhead font-semibold">
                  <Trophy className="h-4 w-4 text-together" />
                  {name} · {wins}
                </span>
              ))}
            </div>
          )}

          {list.length > 1 && (
            <>
              <h3 className="mx-8 mt-6 mb-2 text-caption font-semibold tracking-wide text-text-secondary uppercase">Earlier winners</h3>
              <div className="mx-4 grid grid-cols-2 gap-3">
                {list.slice(1).map((w) => (
                  <button key={w.id} type="button" onClick={() => setOpen(w)} className="text-start">
                    <span className="relative block aspect-square overflow-hidden rounded-card bg-surface ring-2 ring-together/60">
                      {w.src && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={w.src} alt="" loading="lazy" className="h-full w-full object-cover" />
                      )}
                      <Trophy className="absolute start-2 top-2 h-6 w-6 text-[#F5C451] drop-shadow" />
                    </span>
                    <span className="mt-1.5 block text-subhead font-semibold">{w.name}</span>
                    <span className="block text-caption text-text-secondary">{winnerDate(w.day)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <Sheet opened={Boolean(open)} onBackdropClick={() => setOpen(null)} className="w-full">
        {open && (
          <div className="max-h-[85vh] overflow-auto p-4 pb-safe-8">
            <TrophyCard winner={open} />
            <button type="button" onClick={() => setOpen(null)} className="mt-3 h-12 w-full rounded-full bg-surface text-body font-semibold">
              Close
            </button>
          </div>
        )}
      </Sheet>
    </Screen>
  );
}
