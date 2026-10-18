import { createClient } from '@supabase/supabase-js';
import { isDemoMode } from './demo/mode';
import { demoFetch, demoSession } from './demo/fetch';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isDemo = isDemoMode();
export const isConfigured = isDemo || Boolean(url && key);

const DEMO_AUTH_KEY = 'us-demo-auth';

function createDemoClient() {
  // Start already signed in as the demo user.
  try {
    localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(demoSession()));
  } catch {}
  return createClient('https://demo.us.app', 'demo', {
    global: { fetch: demoFetch },
    auth: { storageKey: DEMO_AUTH_KEY, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// Browser-only client. The session lives in localStorage of the installed PWA.
export const supabase = isDemo
  ? createDemoClient()
  : isConfigured
    ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
    : null;

const ERRORS = {
  pair_full: 'This pair already has two people.',
  invalid_invite: 'This invite link is invalid or has already been used.',
  already_in_pair: 'You are already in a pair.',
};

export function errorMessage(error) {
  if (!error) return null;
  const known = Object.keys(ERRORS).find((k) => error.message?.includes(k));
  return known ? ERRORS[known] : error.message || 'Something went wrong.';
}
