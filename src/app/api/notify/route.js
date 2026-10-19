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

/** A new pet post also goes to the partner's Telegram, if she connected the bot. */
async function forwardToTelegram(supabase, postId, myName) {
  if (!isTelegramConfigured()) return;
  const { data: chatId } = await supabase.rpc('partner_telegram_chat');
  if (!chatId) return;
  const { data: post } = await supabase
    .from('cat_posts')
    .select('caption, cat_post_media(url, type, order), cat_post_cats(cats(name))')
    .eq('id', postId)
    .single();
  if (!post) return;
  const files = [...post.cat_post_media].sort((a, b) => a.order - b.order);
  // Telegram fetches the files itself, so give it short-lived links to the private bucket
  const { data: signed } = await supabase.storage.from('media').createSignedUrls(files.map((f) => f.url), 600);
  const media = files.map((f, i) => ({ type: f.type, url: signed?.[i]?.signedUrl })).filter((m) => m.url);
  const pets = post.cat_post_cats.map((c) => c.cats?.name?.trim()).filter(Boolean);
  const caption = [`🐾 ${pets.length ? pets.join(' & ') : 'Unidentified pet'} · from ${myName ?? 'your friend'}`, post.caption].filter(Boolean).join('\n');
  await sendPetPost(chatId, { media, caption });
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
