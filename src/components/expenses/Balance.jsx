'use client';

import { useState } from 'react';
import { Actions, ActionsButton, ActionsGroup, ActionsLabel } from 'konsta/react';
import { useSession } from '../SessionProvider';
import { balances, settleUp } from '@/lib/expenses';
import { money } from '@/lib/trips';

/**
 * "Masha owes you €20" with a Settle up button, per currency.
 * `compact` is the small version for Home and trip pages.
 */
export default function Balance({ expenses, tripId, onChanged, compact = false }) {
  const { me, partner, pair } = useSession();
  const [settling, setSettling] = useState(null);
  if (!partner) return null;
  const rows = balances(expenses, me.id, partner.id);
  const open = rows.filter((r) => Math.abs(r.net) >= 0.01);

  if (!open.length) {
    return (
      <div className={`rounded-card bg-surface ${compact ? 'px-4 py-3' : 'p-5'} text-center`}>
        <p className={`${compact ? 'text-body' : 'text-title'} font-bold`}>You’re all square</p>
        {!compact && <p className="mt-1 text-subhead text-text-secondary">Nobody owes anything</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {open.map((r) => {
        const sheOwes = r.net > 0;
        const amount = money(Math.abs(r.net), r.currency);
        return (
          <div key={r.currency} className={`flex items-center gap-3 rounded-card ${sheOwes ? 'bg-her/15' : 'bg-me/15'} ${compact ? 'px-4 py-3' : 'p-5'}`}>
            <div className="min-w-0 flex-1">
              <p className="text-caption font-semibold tracking-wide text-text-secondary uppercase">{sheOwes ? `${partner.name} owes you` : `You owe ${partner.name}`}</p>
              <p className={`${compact ? 'text-title' : 'text-[34px] leading-tight'} font-bold tabular-nums ${sheOwes ? 'text-her' : 'text-me'}`}>{amount}</p>
            </div>
            <button type="button" onClick={() => setSettling(r)} className="h-10 shrink-0 rounded-full bg-surface px-4 text-subhead font-semibold">
              Settle up
            </button>
          </div>
        );
      })}

      <Actions opened={Boolean(settling)} onBackdropClick={() => setSettling(null)}>
        <ActionsGroup>
          <ActionsLabel>
            {settling &&
              (settling.net > 0
                ? `${partner.name} paid you back ${money(settling.net, settling.currency)}?`
                : `You paid ${partner.name} back ${money(-settling.net, settling.currency)}?`)}
          </ActionsLabel>
          <ActionsButton
            bold
            onClick={async () => {
              const r = settling;
              setSettling(null);
              const from = r.net > 0 ? partner.id : me.id;
              const to = r.net > 0 ? me.id : partner.id;
              await settleUp({ currency: r.currency, amount: Math.abs(r.net), from, to, tripId }, { me, pair });
              onChanged?.();
            }}
          >
            Yes, we’re settled
          </ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton onClick={() => setSettling(null)}>Cancel</ActionsButton>
        </ActionsGroup>
      </Actions>
    </div>
  );
}
