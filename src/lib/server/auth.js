import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** The signed-in user behind a request (Bearer token from the app), or null. */
export async function requestUser(request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token || !url || !key) return null;
  const { data } = await createClient(url, key).auth.getUser(token);
  return data.user ?? null;
}

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$|\[?f[cd])/i;

/** Only public http(s) pages may be fetched on a user's behalf. */
export function publicUrl(raw) {
  try {
    const u = new URL(raw);
    if (!['http:', 'https:'].includes(u.protocol) || PRIVATE_HOST.test(u.hostname)) return null;
    return u;
  } catch {
    return null;
  }
}
