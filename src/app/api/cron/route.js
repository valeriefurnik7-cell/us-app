import { createClient } from '@supabase/supabase-js';
import { sendPushes } from '@/lib/server/push';
import { isTelegramConfigured, sendPetPost } from '@/lib/server/telegram';

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
  return Response.json({ sent, telegram: await sendWinnersToTelegram(supabase, secret) });
}

/** Tonight's Pet of the day, as a photo with a trophy caption, to everyone who gets our pets in Telegram. */
async function sendWinnersToTelegram(supabase, secret) {
  if (!isTelegramConfigured()) return 0;
  const { data: due } = await supabase.rpc('telegram_due_winners', { secret });
  let sent = 0;
  for (const w of due ?? []) {
    const { data: signed } = await supabase.storage.from('media').createSignedUrl(w.photo, 600);
    const date = new Date(`${w.day}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    const caption = `🏆 Pet of the day: ${w.pet}!\n${date}${w.sender ? ` · sent by ${w.sender}` : ''}`;
    const media = signed?.signedUrl ? [{ type: w.media_type, url: signed.signedUrl }] : [];
    const result = await sendPetPost(w.chat_id, { media, caption });
    if (result?.ok) sent += 1;
  }
  return sent;
}
