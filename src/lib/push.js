'use client';

import { supabase } from './supabase';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export const NOTIFICATION_TYPES = [
  { id: 'pet_of_day', label: 'Pet of the day', hint: 'A daily nudge to send your pet' },
  { id: 'new_pet', label: 'New pet photos & messages' },
  { id: 'replies', label: 'Reactions to my photos' },
  { id: 'new_event', label: 'New plans in the calendar' },
  { id: 'new_wish', label: 'New wishes' },
  { id: 'meeting_soon', label: 'Meeting soon', hint: '7 days before and the day before' },
  { id: 'birthday', label: 'Her birthday in a week' },
];

export function pushSupport() {
  if (typeof window === 'undefined') return 'unsupported';
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  // On iPhone, web push only exists for apps added to the Home Screen.
  if (ios && !installed) return 'needs-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !PUBLIC_KEY) return 'unsupported';
  return 'supported';
}

function keyBytes(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

/** Asks for permission (must run from a tap) and saves this device. */
export async function enablePush(me) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  const registration = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'));
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }));
  const json = subscription.toJSON();
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ profile_id: me.id, endpoint: json.endpoint, keys: json.keys }, { onConflict: 'endpoint' });
  return !error;
}

export async function disablePush() {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
  await subscription.unsubscribe();
}

/** Tell the partner about something I just did. Fire and forget — never blocks the UI. */
export function notify(kind, details = {}) {
  supabase.auth.getSession().then(({ data }) => {
    const token = data.session?.access_token;
    if (!token) return;
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind, ...details }),
      keepalive: true,
    }).catch(() => {});
  });
}
