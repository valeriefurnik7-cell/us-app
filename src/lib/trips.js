'use client';

import { useCallback } from 'react';
import { supabase } from './supabase';
import { useLive } from './useLive';
import { withImages } from './images';
import { removeMedia, uploadMedia } from './media';

export const TRIP_STATUSES = [
  { id: 'planned', label: 'Planned' },
  { id: 'going', label: 'Going' },
  { id: 'done', label: 'Been' },
];

export const EXPENSE_CATEGORIES = [
  { id: 'transport', label: 'Getting there' },
  { id: 'stay', label: 'Stay' },
  { id: 'food', label: 'Food' },
  { id: 'fun', label: 'Fun' },
  { id: 'other', label: 'Other' },
];

// Forints read the Hungarian way ("6 000 Ft") and have no cents in practice.
export const money = (amount, currency = 'EUR') =>
  currency === 'HUF'
    ? new Intl.NumberFormat('hu-HU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount ?? 0)
    : new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount ?? 0);

export function tripDates(trip) {
  if (!trip.start) return null;
  const fmt = (d, withYear) =>
    new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
  if (!trip.end || trip.end === trip.start) return fmt(trip.start, true);
  return `${fmt(trip.start)} – ${fmt(trip.end, true)}`;
}

const LIST_TABLES = ['trips', 'trip_stops', 'trip_budgets', 'trip_expenses', 'quick_trips'];

async function loadTrips() {
  // Budgets and expenses come back filtered by RLS: mine, plus hers only where she shares them.
  const [{ data: trips }, { data: stops }, { data: budgets }, { data: expenses }, { data: quick }] = await Promise.all([
    supabase.from('trips').select('*').order('start', { ascending: true, nullsFirst: false }),
    supabase.from('trip_stops').select('id, trip_id, visited'),
    supabase.from('trip_budgets').select('*'),
    supabase.from('trip_expenses').select('trip_id, profile_id, amount'),
    supabase.from('quick_trips').select('*').order('start', { ascending: false }),
  ]);
  const rows = await withImages(trips ?? [], 'cover_url');
  return {
    trips: rows.map((t) => ({
      ...t,
      stops: (stops ?? []).filter((s) => s.trip_id === t.id),
      budgets: (budgets ?? []).filter((b) => b.trip_id === t.id),
      expenses: (expenses ?? []).filter((e) => e.trip_id === t.id),
    })),
    quick: quick ?? [],
  };
}

export const useTrips = () => useLive(loadTrips, LIST_TABLES);

const DETAIL_TABLES = ['trips', 'trip_stops', 'trip_budgets', 'trip_expenses', 'trip_packing'];

export function useTrip(id) {
  const load = useCallback(async () => {
    const [{ data: trip }, { data: stops }, { data: budgets }, { data: expenses }, { data: packing }] = await Promise.all([
      supabase.from('trips').select('*').eq('id', id).maybeSingle(),
      supabase.from('trip_stops').select('*').eq('trip_id', id).order('created_at'),
      supabase.from('trip_budgets').select('*').eq('trip_id', id),
      supabase.from('trip_expenses').select('*').eq('trip_id', id).order('created_at'),
      supabase.from('trip_packing').select('*').eq('trip_id', id).order('item'),
    ]);
    if (!trip) return null;
    const [withCover] = await withImages([trip], 'cover_url');
    return { ...withCover, stops: stops ?? [], budgets: budgets ?? [], expenses: expenses ?? [], packing: packing ?? [] };
  }, [id]);
  return useLive(load, DETAIL_TABLES);
}

export async function saveTrip(trip, { me, pair, cover }) {
  let cover_url = trip.cover_url ?? null;
  if (cover) {
    if (cover_url) await removeMedia([cover_url]);
    cover_url = await uploadMedia(cover, pair.id, 'trips');
  }
  const row = {
    destination: trip.destination.trim(),
    status: trip.status,
    start: trip.start || null,
    end: trip.end || null,
    shared: trip.shared,
    cover_url,
  };
  if (trip.id) return supabase.from('trips').update(row).eq('id', trip.id).select().single();
  const result = await supabase.from('trips').insert({ ...row, pair_id: pair.id, author_id: me.id }).select().single();
  if (!result.error) await supabase.from('activity').insert({ pair_id: pair.id, actor_id: me.id, kind: 'trip', target_id: result.data.id });
  return result;
}

export async function deleteTrip(trip) {
  if (trip.cover_url) await removeMedia([trip.cover_url]);
  return supabase.from('trips').delete().eq('id', trip.id);
}

export const addStop = (tripId, title) => supabase.from('trip_stops').insert({ trip_id: tripId, title: title.trim() });
export const toggleStop = (stop) => supabase.from('trip_stops').update({ visited: !stop.visited }).eq('id', stop.id);
export const deleteStop = (stop) => supabase.from('trip_stops').delete().eq('id', stop.id);

export const saveBudget = (tripId, me, patch) =>
  supabase.from('trip_budgets').upsert({ trip_id: tripId, profile_id: me.id, ...patch }, { onConflict: 'trip_id,profile_id' });

export const addExpense = (tripId, me, expense) =>
  supabase.from('trip_expenses').insert({ trip_id: tripId, profile_id: me.id, category: expense.category, amount: Number(expense.amount), note: expense.note?.trim() || null });
export const deleteExpense = (expense) => supabase.from('trip_expenses').delete().eq('id', expense.id);

export const addPackingItem = (tripId, me, item) => supabase.from('trip_packing').insert({ trip_id: tripId, profile_id: me.id, item: item.trim() });
export const togglePackingItem = (item) => supabase.from('trip_packing').update({ done: !item.done }).eq('id', item.id);
export const deletePackingItem = (item) => supabase.from('trip_packing').delete().eq('id', item.id);

export const addQuickTrip = ({ city, start, end }, { me, pair }) =>
  supabase.from('quick_trips').insert({ pair_id: pair.id, profile_id: me.id, city: city.trim(), start: start || null, end: end || null });
export const deleteQuickTrip = (q) => supabase.from('quick_trips').delete().eq('id', q.id);
