'use client';

import { useState } from 'react';
import { Actions, ActionsButton, ActionsGroup, ActionsLabel, Link, Sheet, Toolbar } from 'konsta/react';
import Avatar from '../Avatar';
import { useSession } from '../SessionProvider';
import { CURRENCIES } from '../wishlist/GiftSheet';
import { SPLIT_CATEGORIES, deleteSharedExpense, saveSharedExpense, sharesFor } from '@/lib/expenses';
import { errorMessage } from '@/lib/supabase';

const today = () => new Date().toISOString().slice(0, 10);

function splitOf(expense, meId, herId) {
  if (!expense) return { split: 'equal', custom: { me: '', her: '' } };
  const mine = Number(expense.shares?.[meId] ?? 0);
  const hers = Number(expense.shares?.[herId] ?? 0);
  if (!hers) return { split: 'me', custom: { me: '', her: '' } };
  if (!mine) return { split: 'her', custom: { me: '', her: '' } };
  if (Math.abs(mine - hers) <= 0.01) return { split: 'equal', custom: { me: '', her: '' } };
  return { split: 'custom', custom: { me: String(mine), her: String(hers) } };
}

function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`h-9 shrink-0 rounded-full px-3.5 text-subhead ${active ? 'bg-accent text-white' : 'bg-surface'}`}>
      {children}
    </button>
  );
}

function ExpenseForm({ expense, trips, defaultTripId, onClose }) {
  const { me, partner, pair } = useSession();
  const herId = partner?.id;
  const initialSplit = splitOf(expense, me.id, herId);
  const [form, setForm] = useState({
    title: expense?.title ?? '',
    amount: expense?.amount ?? '',
    currency: expense?.currency ?? me.currency ?? 'EUR',
    paid_by: expense?.paid_by ?? me.id,
    category: expense?.category ?? 'food',
    spent_on: expense?.spent_on ?? today(),
    trip_id: expense?.trip_id ?? defaultTripId ?? '',
    ...initialSplit,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const amount = Number(form.amount) || 0;
  const customSum = (Number(form.custom.me) || 0) + (Number(form.custom.her) || 0);
  const customOff = form.split === 'custom' && amount > 0 && Math.abs(customSum - amount) > 0.01;

  async function save() {
    setBusy(true);
    setError(null);
    const shares = sharesFor(amount, form.split, me.id, herId, form.custom);
    const { error } = await saveSharedExpense({ ...expense, ...form, shares }, { me, pair });
    if (error) {
      setError(errorMessage(error));
      setBusy(false);
    } else onClose(true);
  }

  const people = [
    { id: me.id, who: 'me', name: 'Me', profile: me },
    { id: herId, who: 'her', name: partner?.name ?? 'Her', profile: partner },
  ];

  return (
    <>
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <Link toolbar onClick={() => onClose(false)}>
          Cancel
        </Link>
        <span className="text-body font-semibold">{expense ? 'Edit expense' : 'New expense'}</span>
        <Link toolbar onClick={save} className={busy || !form.title.trim() || !(amount > 0) || customOff || !herId ? 'pointer-events-none opacity-40' : ''}>
          <b>{expense ? 'Save' : 'Add'}</b>
        </Link>
      </Toolbar>

      <div className="max-h-[82vh] overflow-auto pb-safe-8">
        {/* Big amount, like Tricount */}
        <div className="flex items-baseline justify-center gap-2 px-4 pt-2">
          <input
            type="number"
            inputMode="decimal"
            value={form.amount}
            onChange={set('amount')}
            placeholder="0"
            className="w-44 bg-transparent text-end text-[44px] leading-none font-bold tabular-nums outline-none placeholder:text-text-secondary/40"
          />
          <select value={form.currency} onChange={set('currency')} className="bg-transparent text-title font-semibold text-text-secondary outline-none">
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <input
          value={form.title}
          onChange={set('title')}
          placeholder="What for? Dinner, tickets…"
          className="mx-4 mt-3 h-12 w-[calc(100%-2rem)] rounded-card bg-surface px-4 text-center text-body outline-none"
        />

        <h3 className="mx-8 mt-5 mb-2 text-caption font-semibold tracking-wide text-text-secondary uppercase">Paid by</h3>
        <div className="mx-4 grid grid-cols-2 gap-2">
          {people.map((p) => (
            <button
              key={p.id ?? p.who}
              type="button"
              disabled={!p.id}
              onClick={() => setForm({ ...form, paid_by: p.id })}
              className={`flex h-14 items-center gap-2 rounded-card px-3 text-body font-semibold ${form.paid_by === p.id ? 'bg-accent text-white' : 'bg-surface'}`}
            >
              <Avatar who={p.who} name={p.profile?.name} src={p.profile?.avatar} />
              {p.name}
            </button>
          ))}
        </div>

        <h3 className="mx-8 mt-5 mb-2 text-caption font-semibold tracking-wide text-text-secondary uppercase">For whom</h3>
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
          <Chip active={form.split === 'equal'} onClick={() => setForm({ ...form, split: 'equal' })}>
            Both, equally
          </Chip>
          <Chip active={form.split === 'me'} onClick={() => setForm({ ...form, split: 'me' })}>
            Just me
          </Chip>
          <Chip active={form.split === 'her'} onClick={() => setForm({ ...form, split: 'her' })}>
            Just {partner?.name ?? 'her'}
          </Chip>
          <Chip active={form.split === 'custom'} onClick={() => setForm({ ...form, split: 'custom' })}>
            Custom
          </Chip>
        </div>
        {form.split === 'custom' && (
          <div className="mx-4 mt-2 grid grid-cols-2 gap-2">
            {[
              ['me', 'Me'],
              ['her', partner?.name ?? 'Her'],
            ].map(([key, label]) => (
              <label key={key} className="flex h-12 items-center gap-2 rounded-card bg-surface px-3">
                <span className="text-subhead text-text-secondary">{label}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={form.custom[key]}
                  onChange={(e) => setForm({ ...form, custom: { ...form.custom, [key]: e.target.value } })}
                  placeholder="0"
                  className="w-0 min-w-0 flex-1 bg-transparent text-end text-body font-semibold outline-none"
                />
              </label>
            ))}
            {customOff && <p className="col-span-2 px-1 text-caption text-danger">The parts add up to {customSum}, not {amount}.</p>}
          </div>
        )}
        {form.split === 'equal' && amount > 0 && (
          <p className="mx-8 mt-2 text-caption text-text-secondary">
            {amount / 2} {form.currency} each
          </p>
        )}

        <h3 className="mx-8 mt-5 mb-2 text-caption font-semibold tracking-wide text-text-secondary uppercase">Category</h3>
        <div className="flex flex-wrap gap-2 px-4">
          {SPLIT_CATEGORIES.map((c) => (
            <Chip key={c.id} active={form.category === c.id} onClick={() => setForm({ ...form, category: c.id })}>
              {c.label}
            </Chip>
          ))}
        </div>

        <section className="mx-4 mt-5 overflow-hidden rounded-card bg-surface">
          <label className="flex min-h-12 items-center gap-3 border-b border-text-secondary/15 px-4">
            <span className="w-24 text-body">Date</span>
            <input type="date" value={form.spent_on} onChange={set('spent_on')} className="h-12 w-0 min-w-0 flex-1 bg-transparent text-end text-body text-text-secondary outline-none" />
          </label>
          <label className="flex min-h-12 items-center gap-3 px-4">
            <span className="w-24 text-body">Trip</span>
            <select value={form.trip_id ?? ''} onChange={set('trip_id')} className="min-w-0 flex-1 bg-transparent text-end text-body text-text-secondary outline-none">
              <option value="">No trip</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.destination}
                </option>
              ))}
            </select>
          </label>
        </section>

        {error && <p className="mx-8 mt-3 text-subhead text-danger">{error}</p>}

        {expense && (
          <button type="button" onClick={() => setConfirmDelete(true)} className="mx-4 mt-6 h-12 w-[calc(100%-2rem)] rounded-full bg-surface text-body text-danger">
            Delete expense
          </button>
        )}
      </div>

      <Actions opened={confirmDelete} onBackdropClick={() => setConfirmDelete(false)}>
        <ActionsGroup>
          <ActionsLabel>Delete “{expense?.title}”? The balance will change for both of you.</ActionsLabel>
          <ActionsButton
            className="text-danger!"
            onClick={async () => {
              setConfirmDelete(false);
              await deleteSharedExpense(expense.id);
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

/** Add (expense = null) or edit a shared expense. onClose(changed). */
export default function SharedExpenseSheet({ opened, expense, trips = [], defaultTripId, onClose }) {
  return (
    <Sheet opened={opened} onBackdropClick={() => onClose(false)} className="w-full">
      {opened && <ExpenseForm expense={expense} trips={trips} defaultTripId={defaultTripId} onClose={onClose} />}
    </Sheet>
  );
}
