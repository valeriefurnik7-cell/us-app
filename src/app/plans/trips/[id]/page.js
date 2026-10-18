'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Actions, ActionsButton, ActionsGroup, ActionsLabel, Button, Link, Progressbar, Sheet, Toggle, Toolbar } from 'konsta/react';
import { Airplane, CheckmarkCircleFill, Circle, Xmark } from 'framework7-icons/react';
import Screen, { EmptyState } from '@/components/Screen';
import { InnerNavbar } from '@/components/AppNavbar';
import Avatar from '@/components/Avatar';
import { Field, FieldGroup, TextInput } from '@/components/FormRows';
import { useSession } from '@/components/SessionProvider';
import TripSheet from '@/components/plans/TripSheet';
import { CURRENCIES } from '@/components/wishlist/GiftSheet';
import {
  EXPENSE_CATEGORIES,
  TRIP_STATUSES,
  addExpense,
  addPackingItem,
  addStop,
  deleteExpense,
  deletePackingItem,
  deleteStop,
  deleteTrip,
  money,
  saveBudget,
  togglePackingItem,
  toggleStop,
  tripDates,
  useTrip,
} from '@/lib/trips';

function SectionTitle({ children, action }) {
  return (
    <div className="mx-4 mt-6 mb-1.5 flex items-center justify-between px-4">
      <h3 className="text-caption font-semibold tracking-wide text-text-secondary uppercase">{children}</h3>
      {action}
    </div>
  );
}

/** Checklist rows with an inline "add" field at the bottom. */
function CheckList({ items, label, checked, onToggle, onDelete, onAdd, placeholder }) {
  const [text, setText] = useState('');
  return (
    <ul className="mx-4 overflow-hidden rounded-card bg-surface">
      {items.map((item) => (
        <li key={item.id} className="flex min-h-12 items-center gap-3 border-b border-text-secondary/15 ps-3 pe-1">
          <button type="button" onClick={() => onToggle(item)} className="flex h-11 w-8 items-center justify-center" aria-label="Toggle">
            {checked(item) ? <CheckmarkCircleFill className="text-[22px] text-primary" /> : <Circle className="text-[22px] text-text-secondary/50" />}
          </button>
          <span className={`flex-1 text-body ${checked(item) ? 'text-text-secondary line-through' : ''}`}>{label(item)}</span>
          <button type="button" onClick={() => onDelete(item)} aria-label="Remove" className="flex h-11 w-11 items-center justify-center text-text-secondary/60">
            <Xmark className="text-[14px]" />
          </button>
        </li>
      ))}
      <li>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!text.trim()) return;
            const value = text;
            setText('');
            await onAdd(value);
          }}
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} enterKeyHint="done" className="h-12 w-full bg-transparent px-4 text-body outline-none placeholder:text-primary/70" />
        </form>
      </li>
    </ul>
  );
}

function ExpenseSheet({ opened, currency, onClose, onAdd }) {
  const [form, setForm] = useState({ category: 'food', amount: '', note: '' });
  return (
    <Sheet opened={opened} onBackdropClick={onClose} className="w-full">
      <Toolbar top innerClassName="w-full! items-center! justify-between">
        <Link toolbar onClick={onClose}>
          Cancel
        </Link>
        <span className="text-body font-semibold">New expense</span>
        <Link
          toolbar
          className={!(Number(form.amount) > 0) ? 'pointer-events-none opacity-40' : ''}
          onClick={async () => {
            await onAdd(form);
            setForm({ category: form.category, amount: '', note: '' });
            onClose();
          }}
        >
          <b>Add</b>
        </Link>
      </Toolbar>
      <div className="pb-safe-8">
        <div className="no-scrollbar mx-4 mt-2 flex gap-2 overflow-x-auto">
          {EXPENSE_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setForm({ ...form, category: c.id })}
              className={`h-9 shrink-0 rounded-full px-3 text-subhead ${form.category === c.id ? 'bg-accent text-white' : 'bg-surface-2'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <FieldGroup>
          <Field label={`Amount, ${currency}`}>
            <TextInput type="number" inputMode="decimal" value={form.amount} placeholder="0" onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="Note">
            <TextInput value={form.note} placeholder="Optional" onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
        </FieldGroup>
      </div>
    </Sheet>
  );
}

function Budget({ trip, reload }) {
  const { me, partner } = useSession();
  const mine = trip.budgets.find((b) => b.profile_id === me.id);
  const hers = trip.budgets.find((b) => b.profile_id !== me.id); // only there if she shares it
  const currency = mine?.currency ?? 'EUR';
  const myExpenses = trip.expenses.filter((e) => e.profile_id === me.id);
  const spent = myExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const [amount, setAmount] = useState(mine?.amount ?? '');
  const [adding, setAdding] = useState(false);
  const byCategory = EXPENSE_CATEGORIES.map((c) => ({ ...c, total: myExpenses.filter((e) => e.category === c.id).reduce((s, e) => s + Number(e.amount), 0) })).filter((c) => c.total > 0);
  const save = async (patch) => {
    await saveBudget(trip.id, me, { amount: Number(amount) || 0, currency, visible_to_partner: mine?.visible_to_partner ?? false, ...patch });
    reload();
  };

  return (
    <>
      <SectionTitle action={<button type="button" onClick={() => setAdding(true)} className="h-9 text-subhead text-primary">+ Expense</button>}>My budget</SectionTitle>
      <div className="mx-4 rounded-card bg-surface p-4">
        <p className="text-title font-bold">
          {money(spent, currency)} <span className="text-body font-normal text-text-secondary">of {mine?.amount ? money(mine.amount, currency) : '—'}</span>
        </p>
        {mine?.amount > 0 && <Progressbar className="mt-2" progress={Math.min(1, spent / mine.amount)} />}
        {byCategory.length > 0 && (
          <ul className="mt-3 space-y-1">
            {byCategory.map((c) => (
              <li key={c.id} className="flex justify-between text-subhead">
                <span className="text-text-secondary">{c.label}</span>
                <span>{money(c.total, currency)}</span>
              </li>
            ))}
          </ul>
        )}
        {myExpenses.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-subhead text-primary">All expenses · {myExpenses.length}</summary>
            <ul className="mt-2 space-y-1">
              {myExpenses.map((e) => (
                <li key={e.id} className="flex items-center gap-2 text-subhead">
                  <span className="flex-1 truncate">{e.note || EXPENSE_CATEGORIES.find((c) => c.id === e.category)?.label}</span>
                  <span>{money(e.amount, currency)}</span>
                  <button type="button" aria-label="Delete expense" onClick={async () => { await deleteExpense(e); reload(); }} className="flex h-9 w-9 items-center justify-center text-text-secondary/60">
                    <Xmark className="text-[12px]" />
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
      <FieldGroup footer={mine?.visible_to_partner ? `${partner?.name ?? 'She'} can see your budget and spending.` : 'Only you see your budget.'}>
        <Field label="Budget">
          <TextInput type="number" inputMode="decimal" value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value)} onBlur={() => save({})} />
          <select value={currency} onChange={(e) => save({ currency: e.target.value })} className="w-16 shrink-0 bg-transparent text-end text-body text-text-secondary outline-none">
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label={`Show ${partner?.name ?? 'her'}`}>
          <span className="flex flex-1 justify-end">
            <Toggle checked={mine?.visible_to_partner ?? false} onChange={() => save({ visible_to_partner: !(mine?.visible_to_partner ?? false) })} />
          </span>
        </Field>
      </FieldGroup>

      {hers && (
        <div className="mx-4 mt-3 flex items-center gap-3 rounded-card bg-surface p-4">
          <Avatar who="her" name={partner?.name} src={partner?.avatar} />
          <div className="flex-1">
            <p className="text-subhead">{partner?.name}’s budget</p>
            <p className="text-body font-semibold">
              {money(trip.expenses.filter((e) => e.profile_id === hers.profile_id).reduce((s, e) => s + Number(e.amount), 0), hers.currency)}{' '}
              <span className="font-normal text-text-secondary">of {money(hers.amount, hers.currency)}</span>
            </p>
          </div>
        </div>
      )}

      <ExpenseSheet opened={adding} currency={currency} onClose={() => setAdding(false)} onAdd={async (form) => { await addExpense(trip.id, me, form); reload(); }} />
    </>
  );
}

export default function TripPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const { me, partner } = useSession();
  const { data: trip, loading, reload } = useTrip(id);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (loading) {
    return (
      <Screen>
        <InnerNavbar title="" />
        <div className="mx-4 aspect-[2/1] animate-pulse rounded-card bg-surface" />
      </Screen>
    );
  }
  if (!trip) {
    return (
      <Screen>
        <InnerNavbar title="Trip" />
        <EmptyState title="This trip is gone" />
      </Screen>
    );
  }

  const author = trip.author_id === me.id ? me : partner;
  const myPacking = trip.packing.filter((p) => p.profile_id === me.id);
  const herPacking = trip.packing.filter((p) => p.profile_id !== me.id);

  return (
    <Screen>
      <InnerNavbar title={trip.destination} />

      <div className="mx-4 mt-2 aspect-[2/1] overflow-hidden rounded-card bg-surface-2">
        {trip.cover_urlSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trip.cover_urlSrc} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-text-secondary">
            <Airplane className="text-[48px]" />
          </span>
        )}
      </div>
      <div className="mx-4 mt-3 flex items-center gap-3 px-1">
        <div className="min-w-0 flex-1">
          <p className="text-subhead text-text-secondary">
            {[TRIP_STATUSES.find((s) => s.id === trip.status)?.label, tripDates(trip), trip.shared ? 'Together' : 'Solo'].filter(Boolean).join(' · ')}
          </p>
        </div>
        <Avatar who={trip.author_id === me.id ? 'me' : 'her'} name={author?.name} src={author?.avatar} />
      </div>

      <SectionTitle>Places · {trip.stops.filter((s) => s.visited).length}/{trip.stops.length}</SectionTitle>
      <CheckList
        items={trip.stops}
        label={(s) => s.title}
        checked={(s) => s.visited}
        onToggle={async (s) => { await toggleStop(s); reload(); }}
        onDelete={async (s) => { await deleteStop(s); reload(); }}
        onAdd={async (title) => { await addStop(trip.id, title); reload(); }}
        placeholder="+ Add a place to visit"
      />

      <Budget trip={trip} reload={reload} />

      <SectionTitle>
        My packing list · {myPacking.filter((p) => p.done).length}/{myPacking.length}
      </SectionTitle>
      <CheckList
        items={myPacking}
        label={(p) => p.item}
        checked={(p) => p.done}
        onToggle={async (p) => { await togglePackingItem(p); reload(); }}
        onDelete={async (p) => { await deletePackingItem(p); reload(); }}
        onAdd={async (item) => { await addPackingItem(trip.id, me, item); reload(); }}
        placeholder="+ Add something to pack"
      />
      {herPacking.length > 0 && (
        <p className="mx-8 mt-1.5 text-caption text-text-secondary">
          {partner?.name} has packed {herPacking.filter((p) => p.done).length} of {herPacking.length}
        </p>
      )}

      <div className="mx-4 mt-8 flex gap-2">
        <Button large rounded tonal onClick={() => setEditing(true)}>
          Edit trip
        </Button>
        <Button large rounded clear className="text-danger!" onClick={() => setConfirmDelete(true)}>
          Delete
        </Button>
      </div>

      <TripSheet opened={editing} trip={trip} onClose={(changed) => { setEditing(false); if (changed) reload(); }} />
      <Actions opened={confirmDelete} onBackdropClick={() => setConfirmDelete(false)}>
        <ActionsGroup>
          <ActionsLabel>Delete the trip to {trip.destination} with its places, budgets and packing lists?</ActionsLabel>
          <ActionsButton
            className="text-danger!"
            onClick={async () => {
              setConfirmDelete(false);
              await deleteTrip(trip);
              router.replace('/plans');
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
    </Screen>
  );
}
