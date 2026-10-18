'use client';

import { useState } from 'react';
import { Segmented, SegmentedButton } from 'konsta/react';
import { Plus } from 'framework7-icons/react';
import Screen, { EmptyState } from '@/components/Screen';
import { InnerNavbar } from '@/components/AppNavbar';
import { useLastMainScreen } from '@/components/AppShell';
import Avatar from '@/components/Avatar';
import { useSession } from '@/components/SessionProvider';
import Balance from '@/components/expenses/Balance';
import SharedExpenseSheet from '@/components/expenses/SharedExpenseSheet';
import { SPLIT_CATEGORIES, balances, useSharedExpenses } from '@/lib/expenses';
import { money, useTrips } from '@/lib/trips';

const GENERAL = '__general';

function ExpenseRow({ expense, trips, onOpen }) {
  const { me, partner } = useSession();
  const iPaid = expense.paid_by === me.id;
  const payer = iPaid ? me : partner;
  const myShare = Number(expense.shares?.[me.id] ?? 0);
  const trip = trips.find((t) => t.id === expense.trip_id);
  const category = SPLIT_CATEGORIES.find((c) => c.id === expense.category)?.label;

  if (expense.is_settlement) {
    return (
      <button type="button" onClick={() => onOpen(expense)} className="flex min-h-14 w-full items-center gap-3 border-b border-text-secondary/15 px-4 py-2 text-start">
        <Avatar who={iPaid ? 'me' : 'her'} name={payer?.name} src={payer?.avatar} />
        <span className="flex-1 text-subhead text-text-secondary">
          {iPaid ? `You paid ${partner?.name} back` : `${partner?.name} paid you back`}
        </span>
        <span className="text-subhead font-semibold text-text-secondary">{money(expense.amount, expense.currency)}</span>
      </button>
    );
  }

  return (
    <button type="button" onClick={() => onOpen(expense)} className="flex min-h-16 w-full items-center gap-3 border-b border-text-secondary/15 px-4 py-2.5 text-start">
      <Avatar who={iPaid ? 'me' : 'her'} name={payer?.name} src={payer?.avatar} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-semibold">{expense.title}</span>
        <span className="block truncate text-caption text-text-secondary">
          {[iPaid ? 'You paid' : `${partner?.name} paid`, category, trip?.destination].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="shrink-0 text-end">
        <span className="block text-body font-semibold tabular-nums">{money(expense.amount, expense.currency)}</span>
        <span className="block text-caption text-text-secondary">your part {money(myShare, expense.currency)}</span>
      </span>
    </button>
  );
}

/** Shared expenses, Tricount-style: who paid, who owes whom, settle up. */
export default function ExpensesPage() {
  const lastMain = useLastMainScreen();
  const { me, partner } = useSession();
  const expenses = useSharedExpenses();
  const trips = useTrips();
  const [tab, setTab] = useState('list');
  const [group, setGroup] = useState(() => {
    try {
      return sessionStorage.getItem('expensesGroup') || null;
    } catch {
      return null;
    }
  });
  const [editing, setEditing] = useState(null); // { expense }

  const tripList = trips.data?.trips ?? [];
  const all = expenses.data ?? [];
  const groups = [...new Set(all.map((e) => e.trip_id).filter(Boolean))].map((id) => tripList.find((t) => t.id === id)).filter(Boolean);
  const shown = all.filter((e) => !group || (group === GENERAL ? !e.trip_id : e.trip_id === group));

  const byDay = shown.reduce((acc, e) => {
    (acc[e.spent_on] ??= []).push(e);
    return acc;
  }, {});

  return (
    <Screen>
      <InnerNavbar
        title="Expenses"
        back={lastMain}
        right={
          <button type="button" aria-label="Add expense" onClick={() => setEditing({ expense: null })} className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white">
            <Plus className="text-[18px]" />
          </button>
        }
      />

      <div className="mx-4">
        <Balance expenses={shown} tripId={group && group !== GENERAL ? group : null} onChanged={expenses.reload} />
      </div>

      {groups.length > 0 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
          {[{ id: null, label: 'All' }, { id: GENERAL, label: 'Everyday' }, ...groups.map((t) => ({ id: t.id, label: t.destination }))].map((g) => (
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
      )}

      <div className="mx-4 mt-3">
        <Segmented strong rounded>
          <SegmentedButton strong rounded active={tab === 'list'} onClick={() => setTab('list')}>
            Expenses
          </SegmentedButton>
          <SegmentedButton strong rounded active={tab === 'totals'} onClick={() => setTab('totals')}>
            Totals
          </SegmentedButton>
        </Segmented>
      </div>

      {expenses.loading ? (
        <div className="mx-4 mt-3 h-40 animate-pulse rounded-card bg-surface" />
      ) : shown.length === 0 ? (
        <EmptyState title="No shared expenses yet" text="Add what one of you paid for both — the app keeps the score" actionLabel="Add an expense" onAction={() => setEditing({ expense: null })} />
      ) : tab === 'list' ? (
        Object.entries(byDay).map(([day, list]) => (
          <section key={day}>
            <h3 className="mx-8 mt-5 mb-1.5 text-caption font-semibold tracking-wide text-text-secondary uppercase">
              {new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}
            </h3>
            <div className="mx-4 overflow-hidden rounded-card bg-surface">
              {list.map((e) => (
                <ExpenseRow key={e.id} expense={e} trips={tripList} onOpen={(expense) => setEditing({ expense })} />
              ))}
            </div>
          </section>
        ))
      ) : (
        balances(shown, me.id, partner?.id).map((r) => (
          <section key={r.currency} className="mx-4 mt-4 rounded-card bg-surface p-4">
            <p className="text-caption font-semibold tracking-wide text-text-secondary uppercase">Total spent · {r.currency}</p>
            <p className="text-[34px] leading-tight font-bold tabular-nums">{money(r.total, r.currency)}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                ['me', me, 'You'],
                ['her', partner, partner?.name],
              ].map(([key, who, label]) => (
                <div key={key} className="rounded-control bg-surface-2/60 p-3">
                  <div className="flex items-center gap-2">
                    <Avatar who={key} name={who?.name} src={who?.avatar} className="h-8! w-8! text-[13px]!" />
                    <span className="text-subhead font-semibold">{label}</span>
                  </div>
                  <p className="mt-2 text-caption text-text-secondary">Paid</p>
                  <p className="text-body font-semibold tabular-nums">{money(r.paid[key], r.currency)}</p>
                  <p className="mt-1 text-caption text-text-secondary">Their part</p>
                  <p className="text-body font-semibold tabular-nums">{money(r.owed[key], r.currency)}</p>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      <SharedExpenseSheet
        opened={Boolean(editing)}
        expense={editing?.expense ?? null}
        trips={tripList}
        defaultTripId={group && group !== GENERAL ? group : undefined}
        onClose={(changed) => {
          setEditing(null);
          if (changed) expenses.reload();
        }}
      />
    </Screen>
  );
}
