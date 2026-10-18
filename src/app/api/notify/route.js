import { createClient } from '@supabase/supabase-js';
import { isPushConfigured, sendPushes } from '@/lib/server/push';

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
  const dead = await sendPushes(allowed, { title: 'Us', body: message.body(me?.name ?? 'Your friend', details), url: message.url });
  await Promise.all(dead.map((endpoint) => supabase.rpc('forget_push_endpoint', { dead_endpoint: endpoint })));
  return Response.json({ sent: allowed.length - dead.length });
}
