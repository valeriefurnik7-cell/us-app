import { createClient } from '@supabase/supabase-js';
import { isTelegramConfigured, sendPetPost } from '@/lib/server/telegram';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Downloading the photos and uploading them to Telegram takes a few seconds.
export const maxDuration = 60;

/**
 * A new pet post goes to Telegram: friends who follow our pets, and the other one of us if she
 * connected the bot. Called by the posting phone right after the photos are saved (it waits for
 * the answer), with her session — so the photos are read exactly as the app reads them.
 */
export async function POST(request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { post_id: post } = await request.json().catch(() => ({}));
  if (!isTelegramConfigured() || !post) return Response.json({ sent: 0 });
  const supabase = createClient(url, key, { global: { headers: { authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  return Response.json(await forward(supabase, post));
}

async function forward(supabase, post) {
  const { data: chats, error } = await supabase.rpc('telegram_claim_post', { post });
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
