'use client';

import { isDemo, supabase } from './supabase';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export const NOTIFICATION_TYPES = [
  { id: 'pet_of_day', label: 'Pet of the day', hint: 'A nudge if no pets were sent by your hour, and the winner at 22:00' },
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

/**
 * Asks for permission (must run from a tap) and saves this device.
 * Returns null when it worked, otherwise a sentence explaining what went wrong.
 */
export async function enablePush(me) {
  if (isDemo) return 'Notifications are off in demo mode.';
  let step = 'permission';
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return permission === 'denied'
        ? 'Notifications are blocked for this app. Turn them on in iPhone Settings → Notifications → Us.'
        : 'You didn’t allow notifications. Try again and tap “Allow”.';
    }
    step = 'service worker';
    const registration = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'));
    await navigator.serviceWorker.ready;
    step = 'subscribe';
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }));
    step = 'save';
    const json = subscription.toJSON();
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({ profile_id: me.id, endpoint: json.endpoint, keys: json.keys }, { onConflict: 'endpoint' });
    if (error) throw error;
    return null;
  } catch (e) {
    return `Couldn’t turn on notifications (${step}: ${e?.message ?? e}).`;
  }
}

export async function disablePush() {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
  await subscription.unsubscribe();
}

/** Sends a push to my own devices and says what happened, for Settings. */
export async function sendTestPush() {
  if (isDemo) return 'Notifications are off in demo mode.';
  const { data } = await supabase.auth.getSession();
  const res = await fetch('/api/notify', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}` },
    body: JSON.stringify({ kind: 'test' }),
  }).catch(() => null);
  const result = res?.ok ? await res.json() : null;
  if (!result) return 'Couldn’t reach the server. Check the internet connection.';
  if (result.status === 'no_server_key') return 'The server has no notification key yet: add VAPID_PRIVATE_KEY and NEXT_PUBLIC_VAPID_PUBLIC_KEY in Vercel, then redeploy.';
  if (result.status === 'no_devices') return 'This phone isn’t subscribed yet — turn on “This phone” above first.';
  if (result.status === 'failed') return `Apple refused the notification: ${result.failures[0]}`;
  return `Sent to ${result.devices} device${result.devices === 1 ? '' : 's'}. It should appear in a few seconds.`;
}

/** Tell the partner about something I just did. Fire and forget — never blocks the UI. */
export function notify(kind, details = {}) {
  if (isDemo) return;
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
