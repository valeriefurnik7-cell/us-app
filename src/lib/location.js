'use client';

import { supabase } from './supabase';
import { distanceKm } from './home';

const SESSION_FLAG = 'locationChecked';
const MOVE_KM = 15; // smaller moves don't change the city

function currentPosition() {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      reject,
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30 * 60 * 1000 }
    )
  );
}

/** City name (OpenStreetMap) and time zone (Open-Meteo) for a point — both free, no key. */
async function describe({ lat, lon }) {
  const [place, weather] = await Promise.all([
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&zoom=10&accept-language=en`).then((r) => r.json()),
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&timezone=auto`).then((r) => r.json()),
  ]);
  const a = place.address ?? {};
  return { city: a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? place.name, timezone: weather.timezone };
}

/**
 * Moves my profile to where the phone is, so Home shows the right city, time, weather and distance.
 * Returns the new city, or null when nothing changed (or location isn't allowed).
 */
export async function syncLocation(me, { force = false } = {}) {
  if (!('geolocation' in navigator)) return null;
  const here = await currentPosition();
  if (!force && me.lat != null && distanceKm(me, here) < MOVE_KM) return null;
  const { city, timezone } = await describe(here);
  if (!city) return null;
  await supabase.from('profiles').update({ city, lat: here.lat, lon: here.lon, timezone }).eq('id', me.id);
  return city;
}

/** Once per app launch, if she allowed it. Silent: no prompts beyond the system one. */
export async function autoSyncLocation(me) {
  if (me.notify_prefs?.auto_location === false) return null;
  try {
    if (sessionStorage.getItem(SESSION_FLAG)) return null;
    sessionStorage.setItem(SESSION_FLAG, '1');
  } catch {}
  try {
    return await syncLocation(me);
  } catch {
    return null;
  }
}
