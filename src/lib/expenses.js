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

export const EXPENSE_CURRENCIES = ['EUR', 'HUF'];

/**
 * Shares from a Tricount-style split.
 * mode 'equally': included = { [id]: true|false };  'parts': parts = { [id]: n };  'amounts': amounts = { [id]: n }.
 */
export function sharesFor(amount, { mode, included, parts, amounts }, people) {
  const total = Number(amount) || 0;
  const ids = people.map((p) => p.id);
  if (mode === 'amounts') return Object.fromEntries(ids.map((id) => [id, round(Number(amounts[id]) || 0)]));
  const weights = Object.fromEntries(ids.map((id) => [id, mode === 'parts' ? Math.max(0, Number(parts[id]) || 0) : included[id] ? 1 : 0]));
  const sum = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  // Round each share; the last person absorbs the cent so the shares always add up to the total.
  const shares = {};
  let given = 0;
  ids.forEach((id, i) => {
    shares[id] = i === ids.length - 1 ? round(total - given) : round((total * weights[id]) / sum);
    given += shares[id];
  });
  return shares;
}

/** Back from stored shares to the split the person most likely chose (for editing). */
export function splitFromShares(shares, people) {
  const values = people.map((p) => Number(shares?.[p.id] ?? 0));
  const included = Object.fromEntries(people.map((p, i) => [p.id, values[i] > 0]));
  const nonZero = values.filter((v) => v > 0);
  const base = { included, parts: Object.fromEntries(people.map((p) => [p.id, 1])), amounts: Object.fromEntries(people.map((p, i) => [p.id, String(values[i])])) };
  if (!nonZero.length || nonZero.every((v) => Math.abs(v - nonZero[0]) <= 0.01)) return { ...base, mode: 'equally' };
  // Small whole-number ratios read as parts (2 : 1, 3 : 2 …).
  const min = Math.min(...nonZero);
  for (let unit = 1; unit <= 4; unit += 1) {
    const ratios = values.map((v) => (v / min) * unit);
    if (ratios.every((r) => Math.abs(r - Math.round(r)) < 0.02)) {
      return { ...base, mode: 'parts', parts: Object.fromEntries(people.map((p, i) => [p.id, Math.round(ratios[i])])) };
    }
  }
  return { ...base, mode: 'amounts' };
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
