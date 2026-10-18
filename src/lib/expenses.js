'use client';

import { useCallback } from 'react';
import { supabase } from './supabase';
import { useLive } from './useLive';
import { notify } from './push';

export const SPLIT_CATEGORIES = [
  { id: 'food', label: 'Food & drinks' },
  { id: 'transport', label: 'Transport' },
  { id: 'stay', label: 'Stay' },
  { id: 'fun', label: 'Fun' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'other', label: 'Other' },
];

const TABLES = ['shared_expenses'];

/** All shared expenses, newest first; optionally only one trip's. */
export function useSharedExpenses(tripId) {
  const load = useCallback(async () => {
    let query = supabase.from('shared_expenses').select('*').order('spent_on', { ascending: false }).order('created_at', { ascending: false });
    if (tripId) query = query.eq('trip_id', tripId);
    const { data } = await query;
    return data ?? [];
  }, [tripId]);
  return useLive(load, TABLES);
}

const round = (n) => Math.round(n * 100) / 100;

/**
 * Like Tricount: per currency, how much each paid and owes.
 * Returns [{ currency, net, total, paid: {me, her}, owed: {me, her} }] where net > 0 means she owes me.
 */
export function balances(expenses, meId, herId) {
  const byCurrency = {};
  expenses.forEach((e) => {
    const c = (byCurrency[e.currency] ??= { currency: e.currency, net: 0, total: 0, paid: { me: 0, her: 0 }, owed: { me: 0, her: 0 } });
    const amount = Number(e.amount);
    const myShare = Number(e.shares?.[meId] ?? 0);
    const herShare = Number(e.shares?.[herId] ?? 0);
    const iPaid = e.paid_by === meId;
    // What I'm owed from this one: what I paid minus my own part.
    c.net += (iPaid ? amount : 0) - myShare;
    if (!e.is_settlement) {
      c.total += amount;
      c.paid[iPaid ? 'me' : 'her'] += amount;
      c.owed.me += myShare;
      c.owed.her += herShare;
    }
  });
  return Object.values(byCurrency).map((c) => ({
    ...c,
    net: round(c.net),
    total: round(c.total),
    paid: { me: round(c.paid.me), her: round(c.paid.her) },
    owed: { me: round(c.owed.me), her: round(c.owed.her) },
  }));
}

/** Shares from a split choice. split: 'equal' | 'me' | 'her' | 'custom' (custom = { me, her }). */
export function sharesFor(amount, split, meId, herId, custom) {
  const a = Number(amount) || 0;
  if (split === 'me') return { [meId]: a, [herId]: 0 };
  if (split === 'her') return { [meId]: 0, [herId]: a };
  if (split === 'custom') return { [meId]: Number(custom.me) || 0, [herId]: Number(custom.her) || 0 };
  const half = round(a / 2);
  return { [meId]: half, [herId]: round(a - half) };
}

export async function saveSharedExpense(expense, { me, pair }) {
  const row = {
    title: expense.title.trim(),
    amount: Number(expense.amount),
    currency: expense.currency,
    paid_by: expense.paid_by,
    shares: expense.shares,
    category: expense.category || null,
    spent_on: expense.spent_on,
    trip_id: expense.trip_id || null,
    event_id: expense.event_id || null,
  };
  if (expense.id) return supabase.from('shared_expenses').update(row).eq('id', expense.id);
  const result = await supabase.from('shared_expenses').insert({ ...row, pair_id: pair.id, created_by: me.id }).select().single();
  if (!result.error) notify('expense', { title: row.title });
  return result;
}

export const deleteSharedExpense = (id) => supabase.from('shared_expenses').delete().eq('id', id);

/** "Settle up": the one who owes pays the other back; recorded so the balance returns to zero. */
export function settleUp({ currency, amount, from, to, tripId }, { me, pair }) {
  return supabase.from('shared_expenses').insert({
    pair_id: pair.id,
    created_by: me.id,
    paid_by: from,
    title: 'Settled up',
    amount: round(amount),
    currency,
    shares: { [to]: round(amount), [from]: 0 },
    is_settlement: true,
    spent_on: new Date().toISOString().slice(0, 10),
    trip_id: tripId ?? null,
  });
}
