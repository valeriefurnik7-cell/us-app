'use client';

import { useState } from 'react';
import { Actions, ActionsButton, ActionsGroup, ActionsLabel, Link, Navbar, Page, Popup, Segmented, SegmentedButton } from 'konsta/react';
import { CheckmarkCircleFill, Circle } from 'framework7-icons/react';
import Avatar from '../Avatar';
import { useSession } from '../SessionProvider';
import { EXPENSE_CURRENCIES, SPLIT_CATEGORIES, deleteSharedExpense, saveSharedExpense, sharesFor, splitFromShares } from '@/lib/expenses';
import { money } from '@/lib/trips';
import { errorMessage } from '@/lib/supabase';

const today = () => new Date().toISOString().slice(0, 10);

function Row({ label, children }) {
  return (
    <div className="flex min-h-12 items-center gap-3 border-b border-text-secondary/15 px-4 last:border-0">
      <span className="w-24 shrink-0 text-body text-text-secondary">{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-end">{children}</div>
    </div>
  );
}

/** The Tricount add screen: what, how much, who paid, when — then how it splits between us. */
function ExpenseForm({ expense, trips, defaultTripId, onClose }) {
  const { me, partner, pair } = useSession();
  const people = [
    { id: me.id, who: 'me', name: me.name, profile: me },
    ...(partner ? [{ id: partner.id, who: 'her', name: partner.name, profile: partner }] : []),
  ];
  const [form, setForm] = useState({
    title: expense?.title ?? '',
    amount: expense?.amount != null ? String(expense.amount) : '',
    currency: EXPENSE_CURRENCIES.includes(expense?.currency) ? expense.currency : EXPENSE_CURRENCIES.includes(me.currency) ? me.currency : 'EUR',
    paid_by: expense?.paid_by ?? me.id,
    category: expense?.category ?? null,
    spent_on: expense?.spent_on ?? today(),
    trip_id: expense?.trip_id ?? defaultTripId ?? '',
  });
  const [split, setSplit] = useState(() =>
    expense
      ? splitFromShares(expense.shares, people)
      : {
          mode: 'equally',
          included: Object.fromEntries(people.map((p) => [p.id, true])),
          parts: Object.fromEntries(people.map((p) => [p.id, 1])),
          amounts: Object.fromEntries(people.map((p) => [p.id, ''])),
        }
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const amount = Number(form.amount) || 0;
  const shares = sharesFor(amount, split, people);
  const sharesSum = Object.values(shares).reduce((a, b) => a + b, 0);
  const splitOk = amount > 0 && Math.abs(sharesSum - amount) <= 0.01 && Object.values(shares).some((v) => v > 0);
  const canSave = form.title.trim() && amount > 0 && splitOk && partner;

  async function save() {
    setBusy(true);
    setError(null);
    const { error } = await saveSharedExpense({ ...expense, ...form, shares }, { me, pair });
    if (error) {
      setError(/column|schema cache|relation/i.test(error.message) ? 'The database needs the latest SQL update (Supabase → SQL Editor).' : errorMessage(error));
      setBusy(false);
    } else onClose(true);
  }

  return (
    <Page className="pb-safe-8">
      <Navbar
        title={expense ? 'Edit expense' : 'New expense'}
        left={<Link onClick={() => onClose(false)}>Cancel</Link>}
        right={
          <Link onClick={save} className={!canSave || busy ? 'pointer-events-none opacity-40' : ''}>
            <b>{busy ? 'Saving…' : 'Save'}</b>
          </Link>
        }
      />

      {/* What and how much */}
      <section className="mx-4 mt-2 overflow-hidden rounded-card bg-surface">
        <input
          value={form.title}
          onChange={set('title')}
          placeholder="Title — Dinner, tickets…"
          className="h-14 w-full border-b border-text-secondary/15 bg-transparent px-4 text-body font-semibold outline-none placeholder:font-normal placeholder:text-text-secondary/60"
        />
        <div className="flex items-center gap-3 px-4 py-3">
          <input
            type="number"
            inputMode="decimal"
            value={form.amount}
            onChange={set('amount')}
            placeholder="0"
            className="w-0 min-w-0 flex-1 bg-transparent text-[34px] leading-none font-bold tabular-nums outline-none placeholder:text-text-secondary/40"
          />
          <div className="w-32 shrink-0">
            <Segmented rounded>
              {EXPENSE_CURRENCIES.map((c) => (
                <SegmentedButton key={c} rounded small active={form.currency === c} onClick={() => setForm({ ...form, currency: c })}>
                  {c === 'EUR' ? '€ EUR' : 'Ft HUF'}
                </SegmentedButton>
              ))}
            </Segmented>
          </div>
        </div>
      </section>

      {/* Who paid, when, where */}
      <section className="mx-4 mt-4 overflow-hidden rounded-card bg-surface">
        <Row label="Paid by">
          <div className="flex gap-1.5">
            {people.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setForm({ ...form, paid_by: p.id })}
                className={`flex h-9 items-center gap-1.5 rounded-full ps-1 pe-3 text-subhead font-semibold ${form.paid_by === p.id ? 'bg-accent text-white' : 'bg-surface-2'}`}
              >
                <Avatar who={p.who} name={p.name} src={p.profile?.avatar} className="h-7! w-7! text-[12px]!" />
                {p.id === me.id ? 'Me' : p.name}
              </button>
            ))}
          </div>
        </Row>
        <Row label="When">
          <input type="date" value={form.spent_on} onChange={set('spent_on')} className="h-12 w-0 min-w-0 flex-1 bg-transparent text-end text-body outline-none" />
        </Row>
        <Row label="Trip">
          <select value={form.trip_id ?? ''} onChange={set('trip_id')} className="min-w-0 flex-1 bg-transparent text-end text-body outline-none">
            <option value="">No trip — everyday</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.destination}
              </option>
            ))}
          </select>
        </Row>
      </section>

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
        {SPLIT_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setForm({ ...form, category: form.category === c.id ? null : c.id })}
            className={`h-9 shrink-0 rounded-full px-3 text-subhead ${form.category === c.id ? 'bg-accent text-white' : 'bg-surface'}`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* For whom — equally, as parts, or as amounts */}
      <h3 className="mx-8 mt-6 mb-2 text-caption font-semibold tracking-wide text-text-secondary uppercase">For whom</h3>
      <div className="mx-4">
        <Segmented strong rounded>
          {[
            ['equally', 'Equally'],
            ['parts', 'As parts'],
            ['amounts', 'As amounts'],
          ].map(([id, label]) => (
            <SegmentedButton key={id} strong rounded small active={split.mode === id} onClick={() => setSplit({ ...split, mode: id })}>
              {label}
            </SegmentedButton>
          ))}
        </Segmented>
      </div>
      <section className="mx-4 mt-2 overflow-hidden rounded-card bg-surface">
        {people.map((p) => (
          <div key={p.id} className="flex min-h-14 items-center gap-3 border-b border-text-secondary/15 px-4 last:border-0">
            {split.mode === 'equally' && (
              <button
                type="button"
                aria-label={`Include ${p.name}`}
                onClick={() => setSplit({ ...split, included: { ...split.included, [p.id]: !split.included[p.id] } })}
                className="flex h-11 w-7 items-center justify-center"
              >
                {split.included[p.id] ? <CheckmarkCircleFill className="text-[24px] text-primary" /> : <Circle className="text-[24px] text-text-secondary/40" />}
              </button>
            )}
            <Avatar who={p.who} name={p.name} src={p.profile?.avatar} />
            <span className="min-w-0 flex-1 truncate text-body font-semibold">{p.id === me.id ? 'Me' : p.name}</span>

            {split.mode === 'parts' && (
              <span className="flex h-9 items-center rounded-full bg-surface-2">
                <button
                  type="button"
                  aria-label="Fewer parts"
                  disabled={!split.parts[p.id]}
                  onClick={() => setSplit({ ...split, parts: { ...split.parts, [p.id]: Math.max(0, (split.parts[p.id] ?? 0) - 1) } })}
                  className="flex h-9 w-9 items-center justify-center text-title disabled:opacity-30"
                >
                  −
                </button>
                <span className="min-w-6 text-center text-subhead font-semibold tabular-nums">{split.parts[p.id] ?? 0}</span>
                <button
                  type="button"
                  aria-label="More parts"
                  onClick={() => setSplit({ ...split, parts: { ...split.parts, [p.id]: (split.parts[p.id] ?? 0) + 1 } })}
                  className="flex h-9 w-9 items-center justify-center text-title text-primary"
                >
                  +
                </button>
              </span>
            )}

            {split.mode === 'amounts' ? (
              <input
                type="number"
                inputMode="decimal"
                value={split.amounts[p.id]}
                onChange={(e) => setSplit({ ...split, amounts: { ...split.amounts, [p.id]: e.target.value } })}
                placeholder="0"
                className="h-10 w-24 rounded-control bg-surface-2 px-3 text-end text-body font-semibold tabular-nums outline-none"
              />
            ) : (
              <span className={`w-20 text-end text-body font-semibold tabular-nums ${shares[p.id] ? '' : 'text-text-secondary/50'}`}>{money(shares[p.id] ?? 0, form.currency)}</span>
            )}
          </div>
        ))}
      </section>
      {amount > 0 && !splitOk && (
        <p className="mx-8 mt-2 text-caption text-danger">
          {split.mode === 'amounts' ? `The amounts add up to ${money(sharesSum, form.currency)}, not ${money(amount, form.currency)}.` : 'Pick at least one person.'}
        </p>
      )}

      {error && <p className="mx-8 mt-3 text-subhead text-danger">{error}</p>}

      {expense && (
        <button type="button" onClick={() => setConfirmDelete(true)} className="mx-4 mt-8 h-12 w-[calc(100%-2rem)] rounded-full bg-surface text-body text-danger">
          Delete expense
        </button>
      )}

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
    </Page>
  );
}

/** Add (expense = null) or edit a shared expense, full screen. onClose(changed). */
export default function SharedExpenseSheet({ opened, expense, trips = [], defaultTripId, onClose }) {
  return (
    <Popup opened={opened} onBackdropClick={() => onClose(false)}>
      {opened && <ExpenseForm expense={expense} trips={trips} defaultTripId={defaultTripId} onClose={onClose} />}
    </Popup>
  );
}
