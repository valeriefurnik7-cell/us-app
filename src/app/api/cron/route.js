import { createClient } from '@supabase/supabase-js';
import { sendPushes } from '@/lib/server/push';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Hourly, from a Supabase cron job. The secret it sends is checked inside the database
 * by due_notifications(), so this app never needs to store it.
 */
export async function POST(request) {
  const secret = request.headers.get('x-cron-secret');
  if (!secret) return Response.json({ error: 'forbidden' }, { status: 403 });
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc('due_notifications', { secret });
  if (error) return Response.json({ error: 'forbidden' }, { status: 403 });

  let sent = 0;
  for (const n of data ?? []) {
    const dead = await sendPushes([n], n);
    if (dead.length) await supabase.rpc('forget_push_endpoint', { dead_endpoint: dead[0] });
    else sent += 1;
  }
  return Response.json({ sent });
}
