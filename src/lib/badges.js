'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useLive } from './useLive';

// Which of her actions light up which tab.
const KIND_TAB = {
  pet_photo: '/pets',
  pet_added: '/pets',
  cat_photo: '/pets',
  cat_added: '/pets',
  gift: '/wishlist',
  watch: '/wishlist',
  dream: '/wishlist',
  event: '/plans',
  trip: '/plans',
  place: '/plans',
};

const KEY = 'lastSeen';
const TABLES = ['activity', 'cat_posts'];

function readSeen() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}

function writeSeen(seen) {
  try {
    localStorage.setItem(KEY, JSON.stringify(seen));
  } catch {}
}

/**
 * Tabs with something new from the partner since I last opened them.
 * Opening a tab clears its dot. On the very first launch nothing is "new".
 */
export function useTabBadges(partnerId, currentTab) {
  const [seen, setSeen] = useState(readSeen);

  const load = useCallback(async () => {
    if (!partnerId) return {};
    const [{ data: activity }, { data: lastMessage }] = await Promise.all([
      supabase.from('activity').select('kind, created_at').eq('actor_id', partnerId).order('created_at', { ascending: false }).limit(50),
      // Chat messages don't go to the activity feed, so check them directly.
      supabase.from('cat_posts').select('created_at').eq('author_id', partnerId).order('created_at', { ascending: false }).limit(1),
    ]);
    const latest = {};
    const bump = (tab, at) => {
      if (tab && (!latest[tab] || at > latest[tab])) latest[tab] = at;
    };
    (activity ?? []).forEach((a) => bump(KIND_TAB[a.kind], a.created_at));
    (lastMessage ?? []).forEach((m) => bump('/pets', m.created_at));
    return latest;
  }, [partnerId]);

  const { data: latest } = useLive(load, TABLES);

  // Mark the open tab as seen (now), and start every tab at "now" the first time.
  useEffect(() => {
    if (!currentTab) return;
    const now = new Date().toISOString();
    const next = { ...readSeen() };
    ['/pets', '/wishlist', '/plans', '/expenses'].forEach((t) => (next[t] ??= now));
    next[currentTab] = now;
    writeSeen(next);
    Promise.resolve().then(() => setSeen(next));
  }, [currentTab, latest]);

  const badges = {};
  Object.entries(latest ?? {}).forEach(([tab, at]) => {
    if (tab !== currentTab && seen[tab] && at > seen[tab]) badges[tab] = true;
  });
  return badges;
}
