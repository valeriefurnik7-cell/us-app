import { createClient } from '@supabase/supabase-js';
import { isPushConfigured, sendPushes } from '@/lib/server/push';
import { isTelegramConfigured, sendPetPost } from '@/lib/server/telegram';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// What each action says, and which setting can switch it off.
const MESSAGES = {
  pet_photo: { pref: 'new_pet', body: () => 'New pet in the chat', url: '/pets' },
  message: { pref: 'new_pet', body: (name, d) => (d.text ? `${name}: ${d.text.slice(0, 120)}` : `${name} wrote in the pets chat`), url: '/pets' },
  reply: { pref: 'replies', body: (name) => `${name} replied to your photo`, url: '/pets' },
  event: { pref: 'new_event', body: (name, d) => `${name} added plans for ${d.date}`, url: '/plans' },
  wish: { pref: 'new_wish', body: (name) => `${name} added a wish`, url: '/wishlist' },
  request: { pref: 'replies', body: (name) => `${name} suggested a change`, url: '/' },
  expense: { pref: 'new_event', body: (name, d) => `${name} added an expense: ${d.title ?? ''}`.trim(), url: '/expenses' },
};

/**
 * A new pet post also goes to Telegram: the partner's (if connected) and every friend who follows.
 * Returns a step-by-step report, shown by "Send a test to Telegram" in Settings.
 */
async function forwardToTelegram(supabase, postId, myName) {
  if (!isTelegramConfigured()) return { error: 'TELEGRAM_BOT_TOKEN is missing on the server' };
  const [{ data: partnerChat }, { data: followers, error: followersError }] = await Promise.all([
    supabase.rpc('partner_telegram_chat'),
    supabase.from('telegram_followers').select('chat_id'),
  ]);
  if (followersError) return { error: `followers: ${followersError.message}` };
  const chats = [...new Set([partnerChat, ...(followers ?? []).map((f) => f.chat_id)].filter(Boolean))];
  if (!chats.length) return { error: 'nobody follows yet — the friend has to tap Start on a fresh invite link' };
  const { data: post, error: postError } = await supabase
    .from('cat_posts')
    .select('caption, cat_post_media(url, type, order), cat_post_cats(cats(name))')
    .eq('id', postId)
    .single();
  if (!post) return { error: `post: ${postError?.message ?? 'not found'}` };
  const files = [...post.cat_post_media].sort((a, b) => a.order - b.order);
  const { data: signed } = files.length ? await supabase.storage.from('media').createSignedUrls(files.map((f) => f.url), 600) : { data: [] };
  const media = files.map((f, i) => ({ type: f.type, url: signed?.[i]?.signedUrl })).filter((m) => m.url);
  if (files.length && !media.length) return { error: 'couldn’t sign the photo links' };
  const pets = post.cat_post_cats.map((c) => c.cats?.name?.trim()).filter(Boolean);
  const caption = [`🐾 ${pets.length ? pets.join(' & ') : 'Unidentified pet'} · from ${myName ?? 'your friend'}`, post.caption].filter(Boolean).join('\n');
  const results = await Promise.all(chats.map((chatId) => sendPetPost(chatId, { media, caption })));
  const failed = results.filter((r) => !r?.ok);
  if (failed.length) console.error('telegram', failed);
  return { chats: chats.length, sent: results.length - failed.length, errors: failed.map((r) => r?.description) };
}

/** The signed-in user did something; tell her partner (if she allows this kind of notification). */
export async function POST(request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { kind, ...details } = await request.json().catch(() => ({}));

  // Check who's asking with a plain client: a client carrying the user's token as a global
  // header can't call getUser (Supabase answers "requires a valid Bearer token").
  const { data: user } = await createClient(url, key, { auth: { persistSession: false } }).auth.getUser(token);
  if (!user?.user) return Response.json({ error: 'unauthorized' }, { status: 401 });
  // Then act as that user for the data: RLS and partner_push_targets() decide whom we may reach.
  const supabase = createClient(url, key, { global: { headers: { authorization: `Bearer ${token}` } }, auth: { persistSession: false } });

  // "Send a test notification" from Settings: to my own devices, with a report of what went wrong.
  if (kind === 'test') {
    if (!isPushConfigured()) return Response.json({ status: 'no_server_key' });
    const { data: mine } = await supabase.from('push_subscriptions').select('endpoint, keys');
    if (!mine?.length) return Response.json({ status: 'no_devices' });
    const failures = [];
    const dead = await sendPushes(mine, { title: 'Us', body: 'Test notification — it works!', url: '/settings' }, failures);
    await Promise.all(dead.map((endpoint) => supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)));
    return Response.json({ status: failures.length ? 'failed' : 'sent', devices: mine.length, failures });
  }

  // "Send a test to Telegram" from Settings: forward my latest pet photo and report every step.
  if (kind === 'telegram_test') {
    const { data: latest } = await supabase
      .from('cat_posts')
      .select('id, cat_post_media!inner(id)')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest) return Response.json({ error: 'no pet photos in the chat yet' });
    const { data: me } = await supabase.from('profiles').select('name').eq('id', user.user.id).single();
    return Response.json(await forwardToTelegram(supabase, latest.id, me?.name));
  }

  const message = MESSAGES[kind];
  if (!message) return Response.json({ error: 'unknown_kind' }, { status: 400 });

  const [{ data: me }, { data: targets }] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', user.user.id).single(),
    supabase.rpc('partner_push_targets'),
  ]);
  const allowed = (targets ?? []).filter((t) => t.prefs?.[message.pref] !== false);
  const [dead] = await Promise.all([
    sendPushes(allowed, { title: 'Us', body: message.body(me?.name ?? 'Your friend', details), url: message.url }),
    kind === 'pet_photo' && details.postId ? forwardToTelegram(supabase, details.postId, me?.name) : null,
  ]);
  await Promise.all(dead.map((endpoint) => supabase.rpc('forget_push_endpoint', { dead_endpoint: endpoint })));
  return Response.json({ sent: allowed.length - dead.length });
}
