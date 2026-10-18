'use client';

import { useCallback, useEffect, useState } from 'react';
import { signedUrls } from './media';
import { supabase } from './supabase';
import { useLive } from './useLive';

// ───────────── Time & weather ─────────────

/** Re-renders every minute so clocks stay current. */
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export const localTime = (now, timezone) =>
  now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: timezone || undefined });

/** Minutes the zone is ahead of UTC right now. */
function offset(now, timezone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: timezone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return Math.round((asUtc - now.getTime()) / 60000);
}

/** "She’s 1 hour ahead" / "You’re 2 hours ahead" / null when the clocks match. */
export function timeDifference(now, myZone, herZone, herName) {
  if (!myZone || !herZone) return null;
  const diff = offset(now, herZone) - offset(now, myZone);
  if (diff === 0) return null;
  const hours = Math.abs(diff) / 60;
  const amount = `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hour${hours === 1 ? '' : 's'}`;
  return diff > 0 ? `${herName} is ${amount} ahead` : `You’re ${amount} ahead`;
}

/** Current weather from Open-Meteo (free, no key). */
export function useWeather(lat, lon) {
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    if (lat == null || lon == null) return;
    let cancelled = false;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.current) setWeather({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code, day: d.current.is_day === 1 });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [lat, lon]);
  return weather;
}

/** WMO weather code → icon name. */
export function weatherKind(code, day) {
  if (code === 0) return day ? 'sun' : 'moon';
  if (code <= 2) return day ? 'cloudSun' : 'cloudMoon';
  if (code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'rain';
}

// ───────────── Meetings & counters ─────────────

const HOME_TABLES = ['events', 'trips', 'cat_posts', 'activity'];

async function loadHome() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inTwoYears = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
  const count = async (query) => (await query).count ?? 0;

  const [{ data: upcoming }, meetings, trips, petPhotos, { data: activity }] = await Promise.all([
    supabase.rpc('pair_events', { range_start: today.toISOString(), range_end: inTwoYears.toISOString() }),
    count(supabase.from('events').select('*', { count: 'exact', head: true }).eq('type', 'meeting')),
    count(supabase.from('trips').select('*', { count: 'exact', head: true })),
    count(supabase.from('cat_post_media').select('*', { count: 'exact', head: true }).eq('type', 'photo')),
    supabase.from('activity').select('*').order('created_at', { ascending: false }).limit(20),
  ]);

  const nextMeeting = (upcoming ?? []).find((e) => e.type === 'meeting') ?? null;
  return { nextMeeting, counts: { meetings, trips, petPhotos }, activity: activity ?? [] };
}

export const useHome = () => useLive(loadHome, HOME_TABLES);

// ───────────── Activity feed ─────────────

const KIND_TABLE = { pet_photo: 'cat_posts', cat_photo: 'cat_posts', pet_added: 'cats', cat_added: 'cats', gift: 'gifts', watch: 'watch_items', dream: 'dreams', event: 'events', trip: 'trips', place: 'places' };
const KIND_FIELDS = {
  cat_posts: 'id, caption',
  cats: 'id, name, cover_url',
  gifts: 'id, title, image_url',
  watch_items: 'id, title, poster_url',
  dreams: 'id, title, image_url',
  events: 'id, title, start, city',
  trips: 'id, destination, cover_url',
  places: 'id, title, city, image_url',
};

const day = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

/**
 * Turns raw activity rows into feed items: "added a place in Vienna", a link and a thumbnail.
 * Gift reservations never get here (they're not written to activity).
 */
export async function describeActivity(rows) {
  const byTable = {};
  rows.forEach((r) => {
    const table = KIND_TABLE[r.kind];
    if (table && r.target_id) (byTable[table] ??= []).push(r.target_id);
  });
  const targets = {};
  await Promise.all(
    Object.entries(byTable).map(async ([table, ids]) => {
      const { data } = await supabase.from(table).select(KIND_FIELDS[table]).in('id', ids);
      (data ?? []).forEach((t) => (targets[t.id] = t));
    })
  );

  // First photo of each pet message, for the thumbnail.
  const postIds = byTable.cat_posts ?? [];
  const firstPhoto = {};
  if (postIds.length) {
    const { data } = await supabase.from('cat_post_media').select('post_id, url, order').in('post_id', postIds);
    (data ?? []).sort((a, b) => a.order - b.order).forEach((m) => (firstPhoto[m.post_id] ??= m.url));
  }

  const items = rows
    .map((r) => {
      const t = targets[r.target_id];
      if (!t) return null; // deleted since
      switch (r.kind) {
        case 'pet_photo':
        case 'cat_photo':
          return { ...r, text: 'sent a pet photo', detail: t.caption, href: '/pets', thumb: firstPhoto[t.id] };
        case 'pet_added':
        case 'cat_added':
          return { ...r, text: `added ${t.name} to the pets`, href: `/pets/${t.id}`, thumb: t.cover_url };
        case 'gift':
          return { ...r, text: 'added a wish', detail: t.title, href: '/wishlist', thumb: t.image_url };
        case 'watch':
          return { ...r, text: 'wants to watch', detail: t.title, href: '/wishlist', thumb: t.poster_url };
        case 'dream':
          return { ...r, text: 'added a dream', detail: t.title, href: '/wishlist', thumb: t.image_url };
        case 'event':
          return { ...r, text: `added plans for ${day(t.start)}`, detail: [t.title, t.city].filter(Boolean).join(' · '), href: '/plans' };
        case 'trip':
          return { ...r, text: `added a trip to ${t.destination}`, href: `/plans/trips/${t.id}`, thumb: t.cover_url };
        case 'place':
          return { ...r, text: t.city ? `added a place in ${t.city}` : 'added a place', detail: t.title, href: '/places', thumb: t.image_url };
        default:
          return null;
      }
    })
    .filter(Boolean);

  const urls = await signedUrls(items.map((i) => i.thumb).filter(Boolean));
  return items.map((i) => ({ ...i, thumbSrc: i.thumb ? urls[i.thumb] ?? null : null }));
}

const FEED_TABLES = ['activity'];

/** Everything both of you added, newest first — the Updates feed. */
export function useUpdates(limit) {
  const load = useCallback(async () => {
    const { data } = await supabase.from('activity').select('*').order('created_at', { ascending: false }).limit(limit);
    return describeActivity(data ?? []);
  }, [limit]);
  return useLive(load, FEED_TABLES);
}
