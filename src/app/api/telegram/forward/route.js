import { createClient } from '@supabase/supabase-js';
import { isTelegramConfigured, sendPetPost } from '@/lib/server/telegram';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Called by the database (trigger on a new pet photo) with the cron secret, which
 * telegram_post_to_forward() checks — so the phone that posted doesn't have to stay open.
 */
export async function POST(request) {
  const secret = request.headers.get('x-cron-secret');
  if (!secret) return Response.json({ error: 'forbidden' }, { status: 403 });
  const { post_id: post } = await request.json().catch(() => ({}));
  if (!isTelegramConfigured() || !post) return Response.json({ sent: 0 });

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: chats, error } = await supabase.rpc('telegram_post_to_forward', { secret, post });
  if (error) return Response.json({ error: 'forbidden' }, { status: 403 });
  if (!chats?.length) return Response.json({ sent: 0 });

  const { media: files, author, pets, caption: text } = chats[0];
  const { data: signed } = files.length ? await supabase.storage.from('media').createSignedUrls(files.map((f) => f.url), 600) : { data: [] };
  const media = files.map((f, i) => ({ type: f.type, url: signed?.[i]?.signedUrl })).filter((m) => m.url);
  const caption = [`🐾 ${pets || 'Unidentified pet'} · from ${author ?? 'your friend'}`, text].filter(Boolean).join('\n');

  const results = await Promise.all(chats.map((c) => sendPetPost(c.chat_id, { media, caption })));
  const failed = results.filter((r) => !r?.ok);
  if (failed.length) console.error('telegram forward', failed);
  return Response.json({ sent: results.length - failed.length, errors: failed.map((r) => r?.description) });
}
