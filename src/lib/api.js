import { supabase } from './supabase';

/** GET one of our own /api routes as the signed-in user. */
export async function apiGet(path) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(path, { headers: { authorization: `Bearer ${data.session?.access_token ?? ''}` } });
  return res.ok ? res.json() : null;
}
