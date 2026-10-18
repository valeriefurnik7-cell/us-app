'use client';

import { supabase } from './supabase';
import { useLive } from './useLive';
import { withImages } from './images';
import { removeMedia, signedUrls, uploadMedia } from './media';
import { apiGet } from './api';

export const CATEGORIES = [
  { id: 'food', label: 'Food' },
  { id: 'coffee', label: 'Coffee' },
  { id: 'bars', label: 'Bars' },
  { id: 'exhibitions', label: 'Exhibitions' },
  { id: 'nature', label: 'Nature' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'activities', label: 'Activities' },
];

// OpenStreetMap tags → our categories, for places found by search.
const OSM_CATEGORY = {
  restaurant: 'food', fast_food: 'food', food_court: 'food', bakery: 'food',
  cafe: 'coffee', coffee: 'coffee',
  bar: 'bars', pub: 'bars', biergarten: 'bars', nightclub: 'bars',
  museum: 'exhibitions', gallery: 'exhibitions', arts_centre: 'exhibitions', theatre: 'exhibitions',
  park: 'nature', garden: 'nature', nature_reserve: 'nature', peak: 'nature', beach: 'nature', viewpoint: 'nature',
  mall: 'shopping', marketplace: 'shopping', clothes: 'shopping', books: 'shopping', department_store: 'shopping',
};

const TABLES = ['places', 'place_likes', 'place_visits'];

async function loadPlaces() {
  const [{ data: places }, { data: likes }, { data: visits }] = await Promise.all([
    supabase.from('places').select('*').order('created_at', { ascending: false }),
    supabase.from('place_likes').select('*'),
    supabase.from('place_visits').select('*'),
  ]);
  const visitPhotos = (visits ?? []).flatMap((v) => v.photos ?? []);
  const rows = await withImages(places ?? [], 'image_url');
  const photoUrls = await signedUrls(visitPhotos);
  return rows.map((p) => {
    const visit = (visits ?? []).find((v) => v.place_id === p.id) ?? null;
    return {
      ...p,
      likes: (likes ?? []).filter((l) => l.place_id === p.id).map((l) => l.profile_id),
      visit: visit && { ...visit, photoSrcs: (visit.photos ?? []).map((ph) => photoUrls[ph]).filter(Boolean) },
    };
  });
}

export const usePlaces = () => useLive(loadPlaces, TABLES);

const toResult = (r) => ({
  key: r.place_id,
  title: r.name || r.display_name.split(',')[0],
  subtitle: r.display_name.split(',').slice(1, 3).join(',').trim(),
  lat: Number(r.lat),
  lon: Number(r.lon),
  city: r.address?.city ?? r.address?.town ?? r.address?.village ?? r.address?.municipality ?? null,
  address: [r.address?.road, r.address?.house_number].filter(Boolean).join(' ') || null,
  category: OSM_CATEGORY[r.type] ?? OSM_CATEGORY[r.address?.[r.category]] ?? null,
});

/** Search places by name (OpenStreetMap / Nominatim — free, no key). */
export async function searchPlaces(query, signal) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&addressdetails=1&limit=6&accept-language=en`,
    { signal }
  );
  return (await res.json()).map(toResult);
}

async function reverse(lat, lon) {
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&addressdetails=1&accept-language=en`);
  return toResult(await res.json());
}

/** A Google Maps link → { title, lat, lon, city, address, maps_url }. */
export async function placeFromMapsLink(link) {
  const parsed = await apiGet(`/api/resolve-place?url=${encodeURIComponent(link)}`);
  if (!parsed?.lat) return parsed?.title ? { title: parsed.title, maps_url: link } : null;
  const around = await reverse(parsed.lat, parsed.lon).catch(() => ({}));
  return { ...around, title: parsed.title ?? around.title, lat: parsed.lat, lon: parsed.lon, maps_url: link };
}

export const isMapsLink = (text) => /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.)/i.test(text.trim());

export async function savePlace(place, { me, pair, image }) {
  let image_url = place.image_url ?? null;
  if (image) {
    if (image_url) await removeMedia([image_url]);
    image_url = await uploadMedia(image, pair.id, 'places');
  }
  const row = {
    title: place.title.trim(),
    category: place.category || null,
    city: place.city?.trim() || null,
    address: place.address || null,
    lat: place.lat ?? null,
    lon: place.lon ?? null,
    maps_url: place.maps_url || null,
    note: place.note?.trim() || null,
    meeting_event_id: place.meeting_event_id || null,
    image_url,
  };
  if (place.id) return supabase.from('places').update(row).eq('id', place.id);
  const result = await supabase.from('places').insert({ ...row, pair_id: pair.id, added_by: me.id }).select().single();
  if (!result.error) await supabase.from('activity').insert({ pair_id: pair.id, actor_id: me.id, kind: 'place', target_id: result.data.id });
  return result;
}

export async function deletePlace(place) {
  const files = [place.image_url, ...(place.visit?.photos ?? [])].filter(Boolean);
  await removeMedia(files);
  return supabase.from('places').delete().eq('id', place.id);
}

export const toggleLike = (place, me) =>
  place.likes.includes(me.id)
    ? supabase.from('place_likes').delete().eq('place_id', place.id).eq('profile_id', me.id)
    : supabase.from('place_likes').insert({ place_id: place.id, profile_id: me.id });

/** "We were there": date, my rating & review, photos. Each of us adds her own rating to the same visit. */
export async function saveVisit(place, { me, pair, date, rating, review, photos }) {
  const uploaded = [];
  for (const file of photos ?? []) uploaded.push(await uploadMedia(file, pair.id, `places/${place.id}`));
  const visit = place.visit;
  const ratings = { ...(visit?.ratings ?? {}), [me.id]: { rating, review: review?.trim() || null } };
  return supabase.from('place_visits').upsert(
    { place_id: place.id, visited_at: date, ratings, photos: [...(visit?.photos ?? []), ...uploaded], review: visit?.review ?? null },
    { onConflict: 'place_id' }
  );
}

export async function deleteVisit(place) {
  await removeMedia(place.visit?.photos ?? []);
  return supabase.from('place_visits').delete().eq('place_id', place.id);
}

export const appleMapsUrl = (p) =>
  p.lat != null ? `https://maps.apple.com/?ll=${p.lat},${p.lon}&q=${encodeURIComponent(p.title)}` : p.maps_url ?? `https://maps.apple.com/?q=${encodeURIComponent(`${p.title} ${p.city ?? ''}`)}`;
