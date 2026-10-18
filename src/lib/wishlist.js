'use client';

import { supabase } from './supabase';
import { useLive } from './useLive';
import { withImages } from './images';
import { removeMedia, uploadMedia } from './media';
import { notify } from './push';

// ───────────── Gifts ─────────────

export const GIFT_STATUSES = [
  { id: 'reserved', label: 'I’m giving it' },
  { id: 'ordered', label: 'Ordered' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'given', label: 'Given' },
];

const GIFT_TABLES = ['gifts', 'gift_reservations'];

async function loadGifts() {
  // RLS returns only *my* reservations, so the wisher never learns about hers.
  const [{ data: gifts }, { data: reservations }] = await Promise.all([
    supabase.from('gifts').select('*').order('created_at', { ascending: false }),
    supabase.from('gift_reservations').select('*'),
  ]);
  const byGift = new Map((reservations ?? []).map((r) => [r.gift_id, r]));
  const rows = await withImages(gifts ?? [], 'image_url');
  return rows.map((g) => ({ ...g, reservation: byGift.get(g.id) ?? null }));
}

export const useGifts = () => useLive(loadGifts, GIFT_TABLES);

/** image: File (upload), string (URL from the shop page) or undefined (keep). */
export async function saveGift(gift, { me, pair, image }) {
  let image_url = gift.image_url ?? null;
  if (image instanceof File) image_url = await uploadMedia(image, pair.id, 'gifts');
  else if (typeof image === 'string') image_url = image;
  const row = {
    title: gift.title.trim(),
    url: gift.url?.trim() || null,
    price: gift.price === '' || gift.price == null ? null : Number(gift.price),
    currency: gift.currency || null,
    note: gift.note?.trim() || null,
    list: gift.list?.trim() || null,
    is_secret: Boolean(gift.is_secret),
    image_url,
  };
  if (gift.id) return supabase.from('gifts').update(row).eq('id', gift.id).select().single();
  const result = await supabase.from('gifts').insert({ ...row, pair_id: pair.id, wisher_id: me.id }).select().single();
  // Secret wishes stay quiet: no feed entry, no notification.
  if (!result.error && !row.is_secret) {
    await supabase.from('activity').insert({ pair_id: pair.id, actor_id: me.id, kind: 'gift', target_id: result.data.id });
    notify('wish');
  }
  return result;
}

export async function deleteGift(gift) {
  if (gift.image_url && !gift.image_url.startsWith('http')) await removeMedia([gift.image_url]);
  return supabase.from('gifts').delete().eq('id', gift.id);
}

// No activity row here on purpose: reservations must never show up in the friend's feed.
export const reserveGift = (gift, me) => supabase.from('gift_reservations').insert({ gift_id: gift.id, giver_id: me.id });
export const unreserveGift = (gift) => supabase.from('gift_reservations').delete().eq('gift_id', gift.id);
export const updateReservation = (gift, patch) =>
  supabase
    .from('gift_reservations')
    .update({ ...patch, given_at: patch.status === 'given' ? new Date().toISOString() : patch.status ? null : undefined })
    .eq('gift_id', gift.id);

// ───────────── Watch ─────────────

export const WATCH_STATUSES = [
  { id: 'want', label: 'Want to watch' },
  { id: 'watching', label: 'Watching' },
  { id: 'watched', label: 'Watched' },
];

const WATCH_TABLES = ['watch_items', 'watch_progress'];

async function loadWatch() {
  const [{ data: items }, { data: progress }] = await Promise.all([
    supabase.from('watch_items').select('*').order('created_at', { ascending: false }),
    supabase.from('watch_progress').select('*'),
  ]);
  return (items ?? []).map((i) => ({ ...i, progress: (progress ?? []).filter((p) => p.item_id === i.id) }));
}

export const useWatch = () => useLive(loadWatch, WATCH_TABLES);

export async function addWatchItem(item, { me, pair }) {
  const result = await supabase
    .from('watch_items')
    .insert({ pair_id: pair.id, added_by: me.id, title: item.title.trim(), type: item.type, genre: item.genre || null, poster_url: item.poster_url || null })
    .select()
    .single();
  if (!result.error) await supabase.from('activity').insert({ pair_id: pair.id, actor_id: me.id, kind: 'watch', target_id: result.data.id });
  return result;
}

export const updateWatchItem = (id, patch) => supabase.from('watch_items').update(patch).eq('id', id);
export const deleteWatchItem = (id) => supabase.from('watch_items').delete().eq('id', id);
export const saveProgress = (itemId, me, patch) =>
  supabase.from('watch_progress').upsert({ item_id: itemId, profile_id: me.id, ...patch }, { onConflict: 'item_id,profile_id' });

const GENRES = ['science fiction', 'comedy', 'drama', 'horror', 'thriller', 'romantic', 'romance', 'animated', 'documentary', 'action', 'fantasy', 'crime', 'adventure', 'musical', 'mystery', 'war', 'biographical', 'family', 'superhero', 'western'];
const genreLabel = (g) => ({ 'science fiction': 'Sci-fi', romantic: 'Romance', animated: 'Animation', biographical: 'Biography' })[g] ?? g[0].toUpperCase() + g.slice(1);

/** Keyless lookup: films from Wikipedia (poster + genre from the first sentence), series from TVmaze. */
export async function searchTitles(query, signal) {
  const q = encodeURIComponent(query);
  const [wiki, tv] = await Promise.all([
    fetch(
      `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}%20film&gsrlimit=6&prop=pageimages%7Cdescription%7Cextracts&exintro=1&explaintext=1&exsentences=1&piprop=thumbnail&pithumbsize=400&pilicense=any&format=json&origin=*`,
      { signal }
    )
      .then((r) => r.json())
      .catch(() => null),
    fetch(`https://api.tvmaze.com/search/shows?q=${q}`, { signal })
      .then((r) => r.json())
      .catch(() => []),
  ]);
  const films = Object.values(wiki?.query?.pages ?? {})
    .sort((a, b) => a.index - b.index)
    .filter((p) => /film/i.test(`${p.description} ${p.extract}`) && !/franchise|series/i.test(p.description ?? ''))
    .slice(0, 4)
    .map((p) => {
      const sentence = (p.extract ?? '').toLowerCase();
      const genre = GENRES.find((g) => sentence.includes(g));
      return {
        key: `w${p.pageid}`,
        title: p.title.replace(/\s*\((?:\d{4} )?film\)$/i, ''),
        subtitle: p.description,
        type: 'movie',
        genre: genre ? genreLabel(genre) : null,
        poster_url: p.thumbnail?.source?.split('?')[0] ?? null,
      };
    });
  const series = (tv ?? []).slice(0, 4).map(({ show }) => ({
    key: `t${show.id}`,
    title: show.name,
    subtitle: ['Series', show.premiered?.slice(0, 4)].filter(Boolean).join(' · '),
    type: 'series',
    genre: show.genres?.[0] ?? null,
    poster_url: show.image?.medium?.replace('http://', 'https://') ?? null,
  }));
  return [...films, ...series];
}

// ───────────── Dreams ─────────────

const DREAM_TABLES = ['dreams'];

async function loadDreams() {
  const { data } = await supabase.from('dreams').select('*').order('created_at', { ascending: false });
  return withImages(data ?? [], 'image_url', 'done_photo');
}

export const useDreams = () => useLive(loadDreams, DREAM_TABLES);

export async function saveDream(dream, { me, pair, image }) {
  const image_url = image ? await uploadMedia(image, pair.id, 'dreams') : dream.image_url ?? null;
  const row = { title: dream.title.trim(), owner_id: dream.shared ? null : me.id, image_url };
  if (dream.id) return supabase.from('dreams').update(row).eq('id', dream.id);
  const result = await supabase.from('dreams').insert({ ...row, pair_id: pair.id, added_by: me.id }).select().single();
  if (!result.error) await supabase.from('activity').insert({ pair_id: pair.id, actor_id: me.id, kind: 'dream', target_id: result.data.id });
  return result;
}

export async function markDreamDone(dream, { pair, date, photo }) {
  const done_photo = photo ? await uploadMedia(photo, pair.id, 'dreams') : null;
  return supabase.from('dreams').update({ done_at: date, done_photo }).eq('id', dream.id);
}

export const reopenDream = (dream) => supabase.from('dreams').update({ done_at: null, done_photo: null }).eq('id', dream.id);
export const deleteDream = (dream) => supabase.from('dreams').delete().eq('id', dream.id);
