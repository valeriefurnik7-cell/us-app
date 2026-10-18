// A tiny in-browser stand-in for Supabase, used only in demo mode.
// It answers the REST/RPC/auth calls the app makes, from demo data kept in localStorage.

import { DEMO_HER, DEMO_ME, buildDemoDb } from './data';

const DB_KEY = 'demo-db-v4'; // bump when the demo data changes shape

let db = null;
function load() {
  if (db) return db;
  try {
    db = JSON.parse(localStorage.getItem(DB_KEY));
  } catch {}
  if (!db) {
    db = buildDemoDb();
    save();
  }
  return db;
}
function save() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {}
}

export const DEMO_USER = {
  id: DEMO_ME,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'demo@us.app',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
};

export function demoSession() {
  return {
    access_token: 'demo',
    refresh_token: 'demo',
    token_type: 'bearer',
    expires_in: 60 * 60 * 24 * 365,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    user: DEMO_USER,
  };
}

const json = (body, status = 200, headers = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

// Columns that get defaults on insert, like the real schema.
const DEFAULTS = {
  cats: { species: 'cat', favorites: {} },
  watch_items: { type: 'movie', status: 'want', pinned: false },
  gift_reservations: { status: 'reserved' },
  trips: { status: 'planned', shared: false },
  trip_budgets: { amount: 0, currency: 'EUR', visible_to_partner: false },
  trip_packing: { done: false },
  trip_stops: { visited: false },
  place_visits: { ratings: {}, photos: [] },
  events: { all_day: true, is_private: false },
};
const NO_ID = new Set(['cat_post_cats', 'place_likes', 'gift_reservations', 'watch_progress', 'trip_budgets', 'addresses', 'place_visits']);

/** PostgREST filters from the query string: eq., neq., in.(…), is.null */
function matches(row, params) {
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(key)) continue;
    const [op, ...rest] = raw.split('.');
    const value = rest.join('.');
    const actual = row[key];
    if (op === 'eq' && String(actual) !== value) return false;
    if (op === 'neq' && String(actual) === value) return false;
    if (op === 'is' && value === 'null' && actual != null) return false;
    if (op === 'in' && !value.replace(/^\(|\)$/g, '').split(',').map((v) => v.replace(/"/g, '')).includes(String(actual))) return false;
  }
  return true;
}

function order(rows, spec) {
  if (!spec) return rows;
  const [col, dir] = spec.split(',')[0].split('.');
  const sign = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    if (a[col] == null) return 1;
    if (b[col] == null) return -1;
    return a[col] > b[col] ? sign : a[col] < b[col] ? -sign : 0;
  });
}

/** The one nested select the app uses: messages with their media, pets, reactions and comment count. */
function withEmbeds(table, rows) {
  if (table !== 'cat_posts') return rows;
  return rows.map((p) => ({
    ...p,
    cat_post_media: db.cat_post_media.filter((m) => m.post_id === p.id),
    cat_post_cats: db.cat_post_cats.filter((c) => c.post_id === p.id).map((c) => ({ cat_id: c.cat_id })),
    reactions: db.reactions.filter((r) => r.post_id === p.id),
    comments: [{ count: db.comments.filter((c) => c.post_id === p.id).length }],
  }));
}

/** What RLS would hide from me: her gift reservations, her private budgets. */
function visible(table, rows) {
  if (table === 'gift_reservations') return rows.filter((r) => r.giver_id === DEMO_ME);
  if (table === 'trip_budgets') return rows.filter((b) => b.profile_id === DEMO_ME || b.visible_to_partner);
  if (table === 'events') return rows.filter((e) => e.author_id === DEMO_ME || !e.is_private);
  if (table === 'gifts') return rows.filter((g) => g.wisher_id === DEMO_ME || !g.is_secret);
  return rows;
}

function pairEvents({ range_start, range_end }) {
  const from = new Date(range_start);
  const to = new Date(range_end);
  const inRange = (start, end) => new Date(start) < to && new Date(end ?? start) >= from;
  const events = db.events
    .filter((e) => inRange(e.start, e.end))
    .map((e) => {
      const masked = e.is_private && e.author_id !== DEMO_ME;
      return masked
        ? { ...e, title: 'Busy', type: 'busy', city: null, note: null, masked, source: 'event' }
        : { ...e, masked: false, source: 'event' };
    });
  const trips = db.trips
    .filter((t) => t.start && inRange(`${t.start}T00:00:00`, t.end && `${t.end}T00:00:00`))
    .map((t) => ({ id: t.id, author_id: t.author_id, title: t.destination, type: 'trip', start: `${t.start}T00:00:00`, end: t.end ? `${t.end}T00:00:00` : null, all_day: true, city: t.destination, note: null, is_private: false, masked: false, source: 'trip' }));
  const quick = db.quick_trips
    .filter((q) => q.start && inRange(`${q.start}T00:00:00`, q.end && `${q.end}T00:00:00`))
    .map((q) => ({ id: q.id, author_id: q.profile_id, title: q.city, type: 'trip', start: `${q.start}T00:00:00`, end: q.end ? `${q.end}T00:00:00` : null, all_day: true, city: q.city, note: null, is_private: false, masked: false, source: 'quick_trip' }));
  return [...events, ...trips, ...quick].sort((a, b) => new Date(a.start) - new Date(b.start));
}

async function rest(table, method, url, init) {
  const params = [...url.searchParams.entries()];
  const accept = new Headers(init?.headers).get('accept') ?? '';
  const prefer = new Headers(init?.headers).get('prefer') ?? '';
  const single = accept.includes('vnd.pgrst.object');
  db[table] ??= [];

  if (method === 'GET' || method === 'HEAD') {
    let rows = visible(table, db[table]).filter((r) => matches(r, params));
    if (method === 'HEAD' || prefer.includes('count=')) {
      const total = rows.length;
      if (method === 'HEAD') return new Response(null, { status: 200, headers: { 'content-range': `0-${Math.max(total - 1, 0)}/${total}` } });
    }
    rows = order(rows, url.searchParams.get('order'));
    const limit = Number(url.searchParams.get('limit'));
    if (limit) rows = rows.slice(0, limit);
    rows = withEmbeds(table, rows);
    if (single) return rows[0] ? json(rows[0]) : json({ code: 'PGRST116', message: 'No rows' }, 406);
    return json(rows);
  }

  const body = init?.body ? JSON.parse(init.body) : null;
  const returning = prefer.includes('return=representation');

  if (method === 'POST') {
    const conflict = url.searchParams.get('on_conflict')?.split(',');
    const out = [];
    for (const input of Array.isArray(body) ? body : [body]) {
      const existing = conflict && db[table].find((r) => conflict.every((c) => String(r[c]) === String(input[c])));
      if (existing) {
        Object.assign(existing, input);
        out.push(existing);
        continue;
      }
      const row = { ...DEFAULTS[table], ...input };
      if (!NO_ID.has(table) && !row.id) row.id = crypto.randomUUID();
      row.created_at ??= new Date().toISOString();
      db[table].push(row);
      out.push(row);
    }
    save();
    if (!returning) return new Response(null, { status: 201 });
    return single ? json(out[0], 201) : json(out, 201);
  }

  const targets = db[table].filter((r) => matches(r, params));
  if (method === 'PATCH') {
    targets.forEach((r) => Object.assign(r, body));
    save();
    if (!returning) return new Response(null, { status: 204 });
    return single ? json(targets[0] ?? null) : json(targets);
  }
  if (method === 'DELETE') {
    db[table] = db[table].filter((r) => !targets.includes(r));
    if (table === 'cat_posts') {
      const ids = new Set(targets.map((t) => t.id));
      ['cat_post_media', 'cat_post_cats', 'reactions', 'comments'].forEach((t) => (db[t] = db[t].filter((r) => !ids.has(r.post_id))));
    }
    save();
    return new Response(null, { status: 204 });
  }
  return json({ message: 'not supported in demo' }, 400);
}

/** fetch() replacement handed to the Supabase client in demo mode. */
export async function demoFetch(input, init = {}) {
  load();
  const url = new URL(typeof input === 'string' ? input : input.url);
  const method = (init.method ?? 'GET').toUpperCase();
  const path = url.pathname;

  if (path.startsWith('/auth/v1/')) {
    if (path.endsWith('/logout')) return new Response(null, { status: 204 });
    if (path.endsWith('/user')) return json(DEMO_USER);
    return json(demoSession());
  }
  if (path.startsWith('/rest/v1/rpc/')) {
    const fn = path.split('/').pop();
    const args = init.body ? JSON.parse(init.body) : {};
    if (fn === 'pair_events') return json(pairEvents(args));
    return json([]);
  }
  if (path.startsWith('/rest/v1/')) return rest(path.split('/').pop(), method, url, init);
  if (path.startsWith('/storage/v1/')) return json({ Key: 'demo' });
  return json({});
}

/** Throws the demo data away so it starts fresh next time. */
export function resetDemoData() {
  db = null;
  try {
    localStorage.removeItem(DB_KEY);
  } catch {}
}

export { DEMO_HER };
