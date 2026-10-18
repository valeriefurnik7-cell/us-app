import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);

// Browser-only client. The session lives in localStorage of the installed PWA.
export const supabase = isConfigured
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
