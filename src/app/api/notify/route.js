import { createClient } from '@supabase/supabase-js';
import { sendPushes } from '@/lib/server/push';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// What each action says, and which setting can switch it off.
const MESSAGES = {
  pet_photo: { pref: 'new_pet', body: () => 'New pet in the chat', url: '/pets' },
  message: { pref: 'new_pet', body: (name, d) => (d.text ? `${name}: ${d.text.slice(0, 120)}` : `${name} wrote in the pets chat`), url: '/pets' },
  reply: { pref: 'replies', body: (name) => `${name} replied to your photo`, url: '/pets' },
  event: { pref: 'new_event', body: (name, d) => `${name} added plans for ${d.date}`, url: '/plans' },
  wish: { pref: 'new_wish', body: (name) => `${name} added a wish`, url: '/wishlist' },
};

/** The signed-in user did something; tell her partner (if she allows this kind of notification). */
export async function POST(request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { kind, ...details } = await request.json().catch(() => ({}));
  const message = MESSAGES[kind];
  if (!message) return Response.json({ error: 'unknown_kind' }, { status: 400 });

  // Act as the user: RLS and the partner_push_targets() function decide whom we may reach.
  const supabase = createClient(url, key, { global: { headers: { authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: user } = await supabase.auth.getUser(token);
  if (!user?.user) return Response.json({ error: 'unauthorized' }, { status: 401 });

  const [{ data: me }, { data: targets }] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', user.user.id).single(),
    supabase.rpc('partner_push_targets'),
  ]);
  const allowed = (targets ?? []).filter((t) => t.prefs?.[message.pref] !== false);
  const dead = await sendPushes(allowed, { title: 'Us', body: message.body(me?.name ?? 'Your friend', details), url: message.url });
  await Promise.all(dead.map((endpoint) => supabase.rpc('forget_push_endpoint', { dead_endpoint: endpoint })));
  return Response.json({ sent: allowed.length - dead.length });
}
