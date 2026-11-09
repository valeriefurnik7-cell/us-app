import { createClient } from '@supabase/supabase-js';
import { isTelegramConfigured, sendPetPost } from '@/lib/server/telegram';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Downloading the photos and uploading them to Telegram takes a while
export const maxDuration = 60;

/**
 * Called by the database (trigger on a new pet photo) with the cron secret, which
 * telegram_post_to_forward() checks — so the phone that posted doesn't have to stay open.
 * The answer (who got it, what Telegram said) lands in net._http_response for diagnostics.
 */
export async function POST(request) {
  const secret = request.headers.get('x-cron-secret');
  if (!secret) return Response.json({ error: 'forbidden' }, { status: 403 });
  const { post_id: post } = await request.json().catch(() => ({}));
  if (!isTelegramConfigured() || !post) return Response.json({ sent: 0 });
  return Response.json(await forward(secret, post));
}

async function forward(secret, post) {
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: chats, error } = await supabase.rpc('telegram_post_to_forward', { secret, post });
  if (error) return { error: error.message };
  if (!chats?.length) return { sent: 0, note: 'no chats to send to (or already sent)' };

  const { media: files, author, pets, caption: text } = chats[0];
  const { data: signed } = files.length ? await supabase.storage.from('media').createSignedUrls(files.map((f) => f.url), 600) : { data: [] };
  const media = files.map((f, i) => ({ type: f.type, url: signed?.[i]?.signedUrl })).filter((m) => m.url);
  const caption = [`🐾 ${pets || 'Unidentified pet'} · from ${author ?? 'your friend'}`, text].filter(Boolean).join('\n');

  const results = await Promise.all(chats.map((c) => sendPetPost(c.chat_id, { media, caption })));
  const failed = results.filter((r) => !r?.ok);
  if (failed.length) console.error('telegram forward', failed);
  return { chats: chats.length, files: files.length, signed: media.length, sent: results.length - failed.length, errors: failed.map((r) => r?.description) };
}
