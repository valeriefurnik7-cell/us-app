'use client';

import { useState } from 'react';
import { Actions, ActionsButton, ActionsGroup, ActionsLabel, Segmented, SegmentedButton } from 'konsta/react';
import { ArrowRight, Bag, BedDouble, CarFill, Cart, Plus, Sparkles, Ticket } from 'framework7-icons/react';
import Screen, { EmptyState } from '@/components/Screen';
import { AppNavbar } from '@/components/AppNavbar';
import Avatar from '@/components/Avatar';
import { useSession } from '@/components/SessionProvider';
import SharedExpenseSheet from '@/components/expenses/SharedExpenseSheet';
import { balances, settleUp, useSharedExpenses } from '@/lib/expenses';
import { money, useTrips } from '@/lib/trips';

const GENERAL = '__general';

const CATEGORY_ICON = { food: Cart, transport: CarFill, stay: BedDouble, fun: Ticket, shopping: Bag, other: Sparkles };

function ExpenseRow({ expense, onOpen }) {
  const { me, partner } = useSession();
  const iPaid = expense.paid_by === me.id;
  const Icon = CATEGORY_ICON[expense.category] ?? Sparkles;

  if (expense.is_settlement) {
    return (
      <button type="button" onClick={() => onOpen(expense)} className="flex min-h-14 w-full items-center gap-3 border-b border-text-secondary/15 px-4 py-2 text-start last:border-0">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-her/15 text-her">
          <ArrowRight className="text-[16px]" />
        </span>
        <span className="flex-1 text-subhead text-text-secondary">{iPaid ? `You paid ${partner?.name} back` : `${partner?.name} paid you back`}</span>
        <span className="text-subhead font-semibold text-text-secondary tabular-nums">{money(expense.amount, expense.currency)}</span>
      </button>
    );
  }

  return (
    <button type="button" onClick={() => onOpen(expense)} className="flex min-h-16 w-full items-center gap-3 border-b border-text-secondary/15 px-4 py-2.5 text-start last:border-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-accent/12 text-primary">
        <Icon className="text-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-semibold">{expense.title}</span>
        <span className="block truncate text-subhead text-text-secondary">Paid by {iPaid ? 'me' : partner?.name}</span>
      </span>
      <span className="shrink-0 text-body font-semibold tabular-nums">{money(expense.amount, expense.currency)}</span>
    </button>
  );
}

/** Two people, a bar each: green when she's owed money, red when she owes — like Tricount's balances. */
function Balances({ expenses, tripId, onChanged }) {
  const { me, partner, pair } = useSession();
  const [settling, setSettling] = useState(null);
  const rows = balances(expenses, me.id, partner?.id);
  if (!partner) return null;

  return (
    <>
      {rows.map((r) => {
        const people = [
          { key: 'me', who: me, label: 'Me', value: r.net },
          { key: 'her', who: partner, label: partner.name, value: -r.net },
        ];
        const max = Math.max(1, Math.abs(r.net));
        const settled = Math.abs(r.net) < 0.01;
        const debtor = r.net > 0 ? partner : me;
        const creditor = r.net > 0 ? me : partner;
        return (
          <section key={r.currency} className="mt-4">
            <h3 className="mx-8 mb-1.5 text-caption font-semibold tracking-wide text-text-secondary uppercase">Balances · {r.currency}</h3>
            <div className="mx-4 overflow-hidden rounded-card bg-surface">
              {people.map((p) => (
                <div key={p.key} className="flex items-center gap-3 border-b border-text-secondary/15 px-4 py-3 last:border-0">
                  <Avatar who={p.key} name={p.who.name} src={p.who.avatar} />
                  <span className="w-16 truncate text-body font-semibold">{p.label}</span>
                  {/* centered bar: owed to the right, owing to the left */}
                  <span className="relative flex h-8 flex-1 items-center">
                    <span className="absolute inset-y-0 left-1/2 w-px bg-text-secondary/25" />
                    {Math.abs(p.value) >= 0.01 && (
                      <span
                        className={`absolute top-1 bottom-1 rounded-md ${p.value > 0 ? 'left-1/2 bg-her/70' : 'right-1/2 bg-danger/70'}`}
                        style={{ width: `${(Math.abs(p.value) / max) * 50}%` }}
                      />
                    )}
                  </span>
                  <span className={`w-24 text-end text-subhead font-bold whitespace-nowrap tabular-nums ${p.value > 0.009 ? 'text-her' : p.value < -0.009 ? 'text-danger' : 'text-text-secondary'}`}>
                    {p.value > 0.009 ? '+' : ''}
                    {money(p.value, r.currency)}
                  </span>
                </div>
              ))}
            </div>

            <h3 className="mx-8 mt-4 mb-1.5 text-caption font-semibold tracking-wide text-text-secondary uppercase">How to balance</h3>
            {settled ? (
              <p className="mx-4 rounded-card bg-surface px-4 py-4 text-center text-body font-semibold">All settled up</p>
            ) : (
              <div className="mx-4 flex items-center gap-3 rounded-card bg-surface px-4 py-3">
                <Avatar who={debtor.id === me.id ? 'me' : 'her'} name={debtor.name} src={debtor.avatar} />
                <span className="min-w-0 flex-1">
                  <span className="block text-body">
                    <b className="font-semibold">{debtor.id === me.id ? 'You' : debtor.name}</b> owe{debtor.id === me.id ? '' : 's'}{' '}
                    <b className="font-semibold">{creditor.id === me.id ? 'you' : creditor.name}</b>
                  </span>
                  <span className="block text-title font-bold tabular-nums">{money(Math.abs(r.net), r.currency)}</span>
                </span>
                <button type="button" onClick={() => setSettling(r)} className="h-10 shrink-0 rounded-full bg-accent px-4 text-subhead font-semibold text-white">
                  Mark as paid
                </button>
              </div>
            )}

            <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
              {[
                ['me', 'Me'],
                ['her', partner.name],
              ].map(([key, label]) => (
                <div key={key} className="rounded-card bg-surface px-3 py-2.5">
                  <p className="text-caption text-text-secondary">{label} paid</p>
                  <p className="text-body font-semibold tabular-nums">{money(r.paid[key], r.currency)}</p>
                  <p className="mt-1 text-caption text-text-secondary">{label === 'Me' ? 'My' : 'Her'} expenses</p>
                  <p className="text-body font-semibold tabular-nums">{money(r.owed[key], r.currency)}</p>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <Actions opened={Boolean(settling)} onBackdropClick={() => setSettling(null)}>
        <ActionsGroup>
          <ActionsLabel>
            {settling &&
              (settling.net > 0
                ? `${partner.name} paid you ${money(settling.net, settling.currency)}?`
                : `You paid ${partner.name} ${money(-settling.net, settling.currency)}?`)}
          </ActionsLabel>
          <ActionsButton
            bold
            onClick={async () => {
              const r = settling;
              setSettling(null);
              await settleUp(
                { currency: r.currency, amount: Math.abs(r.net), from: r.net > 0 ? partner.id : me.id, to: r.net > 0 ? me.id : partner.id, tripId },
                { me, pair }
              );
              onChanged();
            }}
          >
            Yes, mark as paid
          </ActionsButton>
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton onClick={() => setSettling(null)}>Cancel</ActionsButton>
        </ActionsGroup>
      </Actions>
    </>
  );
}

/** Shared expenses, laid out like Tricount: groups, Expenses / Balances, a big add button. */
export default function ExpensesPage() {
  const { me, partner } = useSession();
  const expenses = useSharedExpenses();
  const trips = useTrips();
  const [tab, setTab] = useState('list');
  const [group, setGroup] = useState(() => {
    try {
      const saved = sessionStorage.getItem('expensesGroup');
      sessionStorage.removeItem('expensesGroup');
      return saved || null;
    } catch {
      return null;
    }
  });
  const [editing, setEditing] = useState(null); // { expense }

  const tripList = trips.data?.trips ?? [];
  const all = expenses.data ?? [];
  const usedTrips = [...new Set(all.map((e) => e.trip_id).filter(Boolean))].map((id) => tripList.find((t) => t.id === id)).filter(Boolean);
  const shown = all.filter((e) => !group || (group === GENERAL ? !e.trip_id : e.trip_id === group));
  const sums = balances(shown, me.id, partner?.id);

  const byDay = shown.reduce((acc, e) => {
    (acc[e.spent_on] ??= []).push(e);
    return acc;
  }, {});
  const groupTrip = group && group !== GENERAL ? group : undefined;

  return (
    <Screen className="pb-[calc(var(--k-safe-area-bottom)+180px)]">
      <AppNavbar title="Expenses" onAdd={() => setEditing({ expense: null })} />

      {/* Groups, like separate tricounts */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
        {[{ id: null, label: 'All' }, { id: GENERAL, label: 'Everyday' }, ...usedTrips.map((t) => ({ id: t.id, label: t.destination }))].map((g) => (
          <button
            key={g.id ?? 'all'}
            type="button"
            onClick={() => setGroup(g.id)}
            className={`h-9 shrink-0 rounded-full px-3.5 text-subhead ${group === g.id ? 'bg-accent text-white' : 'bg-surface'}`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="mx-4 mt-3">
        <Segmented strong rounded>
          <SegmentedButton strong rounded active={tab === 'list'} onClick={() => setTab('list')}>
            Expenses
          </SegmentedButton>
          <SegmentedButton strong rounded active={tab === 'balances'} onClick={() => setTab('balances')}>
            Balances
          </SegmentedButton>
        </Segmented>
      </div>

      {expenses.loading ? (
        <div className="mx-4 mt-3 h-40 animate-pulse rounded-card bg-surface" />
      ) : shown.length === 0 ? (
        <EmptyState title="No expenses yet" text="Add what one of you paid — the app keeps the score" actionLabel="Add an expense" onAction={() => setEditing({ expense: null })} />
      ) : tab === 'list' ? (
        <>
          {/* My expenses / Total expenses */}
          <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
            {[
              ['My expenses', (r) => r.owed.me],
              ['Total expenses', (r) => r.total],
            ].map(([label, pick]) => (
              <div key={label} className="rounded-card bg-surface px-4 py-3">
                <p className="text-caption font-semibold tracking-wide text-text-secondary uppercase">{label}</p>
                {sums.map((r) => (
                  <p key={r.currency} className="text-title font-bold tabular-nums">
                    {money(pick(r), r.currency)}
                  </p>
                ))}
              </div>
            ))}
          </div>

          {Object.entries(byDay).map(([day, list]) => (
            <section key={day}>
              <h3 className="mx-8 mt-5 mb-1.5 text-caption font-semibold tracking-wide text-text-secondary uppercase">
                {new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <div className="mx-4 overflow-hidden rounded-card bg-surface">
                {list.map((e) => (
                  <ExpenseRow key={e.id} expense={e} onOpen={(expense) => setEditing({ expense })} />
                ))}
              </div>
            </section>
          ))}
        </>
      ) : (
        <Balances expenses={shown} tripId={groupTrip ?? null} onChanged={expenses.reload} />
      )}

      {/* The big add button, always within reach */}
      <button
        type="button"
        onClick={() => setEditing({ expense: null })}
        className="app-bottom-bar fixed inset-x-0 bottom-[calc(var(--k-safe-area-bottom)+84px)] z-20 mx-auto flex h-12 w-56 items-center justify-center gap-2 rounded-full bg-accent text-body font-semibold text-white shadow-lg"
      >
        <Plus className="text-[18px]" />
        Add expense
      </button>

      <SharedExpenseSheet
        opened={Boolean(editing)}
        expense={editing?.expense ?? null}
        trips={tripList}
        defaultTripId={groupTrip}
        onClose={(changed) => {
          setEditing(null);
          if (changed) expenses.reload();
        }}
      />
    </Screen>
  );
}
