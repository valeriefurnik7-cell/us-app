-- Us: full data model with Row Level Security.
-- Every row belongs to a pair; only the two members of that pair can reach it.
-- Run once in Supabase → SQL Editor.


-- ───────────────────────── Pairs & profiles ─────────────────────────

create table public.pairs (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Us',
  theme text,
  invite_code text unique,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  pair_id uuid not null references public.pairs (id) on delete cascade,
  name text not null,
  avatar_url text,
  city text,
  lat double precision,
  lon double precision,
  timezone text,
  birthday date,
  created_at timestamptz not null default now()
);
create index on public.profiles (pair_id);

create table public.addresses (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  country text,
  city text,
  street text,
  apartment text,
  zip text,
  recipient text,
  phone text,
  updated_at timestamptz not null default now()
);

-- Pair of the current user (security definer so policies can call it without recursion).
create or replace function public.my_pair_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select pair_id from profiles where id = auth.uid() $$;

-- The other member of the current user's pair.
create or replace function public.partner_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select id from profiles where pair_id = my_pair_id() and id <> auth.uid() limit 1 $$;

-- Hard limit: a pair never has more than two members.
create or replace function public.enforce_pair_limit()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform 1 from pairs where id = new.pair_id for update;
  if (select count(*) from profiles where pair_id = new.pair_id) >= 2 then
    raise exception 'pair_full';
  end if;
  return new;
end $$;

create trigger profiles_pair_limit
before insert on public.profiles
for each row execute function public.enforce_pair_limit();

-- Create a pair and join it as its first member. Returns the invite code.
create or replace function public.create_pair(pair_name text, my_name text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  new_pair pairs;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from profiles where id = auth.uid()) then raise exception 'already_in_pair'; end if;

  insert into pairs (name, invite_code, created_by)
  values (
    coalesce(nullif(trim(pair_name), ''), 'Us'),
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
    auth.uid()
  )
  returning * into new_pair;

  insert into profiles (id, pair_id, name) values (auth.uid(), new_pair.id, trim(my_name));
  return new_pair.invite_code;
end $$;

-- Join a pair by invite code. The code is burned on use, so the pair closes.
create or replace function public.join_pair(code text, my_name text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  target pairs;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from profiles where id = auth.uid()) then raise exception 'already_in_pair'; end if;

  select * into target from pairs where invite_code = code for update;
  if target.id is null then raise exception 'invalid_invite'; end if;

  insert into profiles (id, pair_id, name) values (auth.uid(), target.id, trim(my_name));
  update pairs set invite_code = null where id = target.id;
  return target.id;
end $$;

revoke all on function public.create_pair(text, text) from public, anon;
revoke all on function public.join_pair(text, text) from public, anon;
grant execute on function public.create_pair(text, text) to authenticated;
grant execute on function public.join_pair(text, text) to authenticated;

alter table public.pairs enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;

create policy pairs_select on public.pairs for select using (id = my_pair_id());
create policy pairs_update on public.pairs for update using (id = my_pair_id()) with check (id = my_pair_id());
-- Members may rename the pair or change its theme, but never touch the invite code or owner.
revoke update on public.pairs from authenticated;
grant update (name, theme) on public.pairs to authenticated;

create policy profiles_select on public.profiles for select using (pair_id = my_pair_id());
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- pair_id is set only by create_pair / join_pair
revoke update on public.profiles from authenticated;
grant update (name, avatar_url, city, lat, lon, timezone, birthday) on public.profiles to authenticated;

-- Address: the owner edits it, the partner reads it, nobody else sees it.
create policy addresses_select on public.addresses for select
  using (profile_id = auth.uid() or profile_id = partner_id());
create policy addresses_insert on public.addresses for insert with check (profile_id = auth.uid());
create policy addresses_update on public.addresses for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy addresses_delete on public.addresses for delete using (profile_id = auth.uid());

-- ───────────────────────── Cats ─────────────────────────

create table public.cats (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  breed text,
  birthday date,
  character text,
  favorites jsonb not null default '{}',
  cover_url text,
  created_at timestamptz not null default now()
);

create table public.cat_posts (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  caption text,
  created_at timestamptz not null default now()
);
create index on public.cat_posts (pair_id, created_at desc);

create table public.cat_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.cat_posts (id) on delete cascade,
  url text not null,
  type text not null check (type in ('photo', 'video')),
  "order" int not null default 0
);

create table public.cat_post_cats (
  post_id uuid not null references public.cat_posts (id) on delete cascade,
  cat_id uuid not null references public.cats (id) on delete cascade,
  primary key (post_id, cat_id)
);

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.cat_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (post_id, author_id, emoji)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.cat_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Wishlist ─────────────────────────

create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  wisher_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  url text,
  image_url text,
  price numeric,
  currency text,
  note text,
  created_at timestamptz not null default now()
);

create table public.gift_reservations (
  gift_id uuid primary key references public.gifts (id) on delete cascade,
  giver_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'reserved' check (status in ('reserved', 'ordered', 'delivered', 'given')),
  tracking text,
  given_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.watch_items (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  added_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  type text not null default 'movie' check (type in ('movie', 'series')),
  genre text,
  poster_url text,
  pinned boolean not null default false,
  status text not null default 'want' check (status in ('want', 'watching', 'watched')),
  created_at timestamptz not null default now()
);

create table public.watch_progress (
  item_id uuid not null references public.watch_items (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  season int,
  episode int,
  rating int check (rating between 1 and 5),
  review text,
  primary key (item_id, profile_id)
);

create table public.dreams (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  owner_id uuid references public.profiles (id) on delete cascade, -- null = shared dream
  added_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  image_url text,
  done_at date,
  done_photo text,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Plans ─────────────────────────

create table public.events (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  type text not null check (type in ('meeting', 'trip', 'busy', 'important')),
  start timestamptz not null,
  "end" timestamptz,
  all_day boolean not null default true,
  city text,
  note text,
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.events (pair_id, start);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  destination text not null,
  cover_url text,
  status text not null default 'planned' check (status in ('planned', 'going', 'done')),
  start date,
  "end" date,
  shared boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.trip_budgets (
  trip_id uuid not null references public.trips (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric not null default 0,
  currency text not null default 'EUR',
  visible_to_partner boolean not null default false,
  primary key (trip_id, profile_id)
);

create table public.trip_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('transport', 'stay', 'food', 'fun', 'other')),
  amount numeric not null,
  note text,
  created_at timestamptz not null default now()
);

create table public.trip_packing (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  item text not null,
  done boolean not null default false
);

create table public.quick_trips (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  city text not null,
  start date,
  "end" date
);

-- ───────────────────────── Places ─────────────────────────

create table public.places (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  added_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  category text check (category in ('food', 'coffee', 'bars', 'exhibitions', 'nature', 'shopping', 'activities')),
  city text,
  address text,
  lat double precision,
  lon double precision,
  maps_url text,
  image_url text,
  note text,
  meeting_event_id uuid references public.events (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.place_likes (
  place_id uuid not null references public.places (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (place_id, profile_id)
);

create table public.place_visits (
  place_id uuid primary key references public.places (id) on delete cascade,
  visited_at date not null,
  ratings jsonb not null default '{}', -- { "<profile_id>": 1..5 }
  photos text[] not null default '{}',
  review text
);

-- ───────────────────────── Activity & push ─────────────────────────

create table public.activity (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null, -- never gift reservations
  target_id uuid,
  created_at timestamptz not null default now()
);
create index on public.activity (pair_id, created_at desc);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  prefs jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ───────────────────────── RLS ─────────────────────────

-- Tables keyed by pair_id: both members read and write; inserts must name yourself as author.
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('cats', 'owner_id'),
      ('cat_posts', 'author_id'),
      ('gifts', 'wisher_id'),
      ('watch_items', 'added_by'),
      ('dreams', 'added_by'),
      ('trips', 'author_id'),
      ('quick_trips', 'profile_id'),
      ('places', 'added_by'),
      ('activity', 'actor_id')
    ) as v(tbl, author_col)
  loop
    execute format('alter table public.%I enable row level security', t.tbl);
    execute format('create policy %I on public.%I for select using (pair_id = my_pair_id())', t.tbl || '_select', t.tbl);
    execute format('create policy %I on public.%I for insert with check (pair_id = my_pair_id() and %I = auth.uid())', t.tbl || '_insert', t.tbl, t.author_col);
    execute format('create policy %I on public.%I for update using (pair_id = my_pair_id()) with check (pair_id = my_pair_id())', t.tbl || '_update', t.tbl);
    execute format('create policy %I on public.%I for delete using (pair_id = my_pair_id())', t.tbl || '_delete', t.tbl);
  end loop;
end $$;

-- Events: the partner never receives private rows from the table itself.
-- Stage 5 adds a function that returns them masked as "busy" with dates only.
alter table public.events enable row level security;
create policy events_select on public.events for select
  using (pair_id = my_pair_id() and (author_id = auth.uid() or not is_private));
create policy events_insert on public.events for insert
  with check (pair_id = my_pair_id() and author_id = auth.uid());
create policy events_update on public.events for update
  using (author_id = auth.uid() or (pair_id = my_pair_id() and not is_private))
  with check (pair_id = my_pair_id());
create policy events_delete on public.events for delete
  using (author_id = auth.uid() or (pair_id = my_pair_id() and not is_private));

-- Child rows of a cat post follow the post.
alter table public.cat_post_media enable row level security;
alter table public.cat_post_cats enable row level security;
create policy cat_post_media_all on public.cat_post_media for all
  using (exists (select 1 from cat_posts p where p.id = post_id and p.pair_id = my_pair_id()))
  with check (exists (select 1 from cat_posts p where p.id = post_id and p.pair_id = my_pair_id()));
create policy cat_post_cats_all on public.cat_post_cats for all
  using (exists (select 1 from cat_posts p where p.id = post_id and p.pair_id = my_pair_id()))
  with check (exists (select 1 from cat_posts p where p.id = post_id and p.pair_id = my_pair_id()));

alter table public.reactions enable row level security;
alter table public.comments enable row level security;
create policy reactions_select on public.reactions for select
  using (exists (select 1 from cat_posts p where p.id = post_id and p.pair_id = my_pair_id()));
create policy reactions_insert on public.reactions for insert
  with check (author_id = auth.uid() and exists (select 1 from cat_posts p where p.id = post_id and p.pair_id = my_pair_id()));
create policy reactions_delete on public.reactions for delete using (author_id = auth.uid());
create policy comments_select on public.comments for select
  using (exists (select 1 from cat_posts p where p.id = post_id and p.pair_id = my_pair_id()));
create policy comments_insert on public.comments for insert
  with check (author_id = auth.uid() and exists (select 1 from cat_posts p where p.id = post_id and p.pair_id = my_pair_id()));
create policy comments_update on public.comments for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy comments_delete on public.comments for delete using (author_id = auth.uid());

-- Gift reservations: only the giver, only on the partner's gifts. The wisher gets nothing, even via the API.
alter table public.gift_reservations enable row level security;
create policy gift_reservations_all on public.gift_reservations for all
  using (giver_id = auth.uid())
  with check (
    giver_id = auth.uid()
    and exists (select 1 from gifts g where g.id = gift_id and g.pair_id = my_pair_id() and g.wisher_id <> auth.uid())
  );

alter table public.watch_progress enable row level security;
create policy watch_progress_select on public.watch_progress for select
  using (exists (select 1 from watch_items w where w.id = item_id and w.pair_id = my_pair_id()));
create policy watch_progress_write on public.watch_progress for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and exists (select 1 from watch_items w where w.id = item_id and w.pair_id = my_pair_id()));

-- Budgets and expenses: owner always; partner only when the owner shares the budget.
alter table public.trip_budgets enable row level security;
alter table public.trip_expenses enable row level security;
create policy trip_budgets_select on public.trip_budgets for select
  using (profile_id = auth.uid() or (visible_to_partner and profile_id = partner_id()));
create policy trip_budgets_write on public.trip_budgets for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and exists (select 1 from trips t where t.id = trip_id and t.pair_id = my_pair_id()));
create policy trip_expenses_select on public.trip_expenses for select
  using (
    profile_id = auth.uid()
    or (profile_id = partner_id() and exists (
      select 1 from trip_budgets b where b.trip_id = trip_expenses.trip_id and b.profile_id = trip_expenses.profile_id and b.visible_to_partner
    ))
  );
create policy trip_expenses_write on public.trip_expenses for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and exists (select 1 from trips t where t.id = trip_id and t.pair_id = my_pair_id()));

alter table public.trip_packing enable row level security;
create policy trip_packing_all on public.trip_packing for all
  using (exists (select 1 from trips t where t.id = trip_id and t.pair_id = my_pair_id()))
  with check (exists (select 1 from trips t where t.id = trip_id and t.pair_id = my_pair_id()));

alter table public.place_likes enable row level security;
create policy place_likes_select on public.place_likes for select
  using (exists (select 1 from places p where p.id = place_id and p.pair_id = my_pair_id()));
create policy place_likes_write on public.place_likes for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and exists (select 1 from places p where p.id = place_id and p.pair_id = my_pair_id()));

alter table public.place_visits enable row level security;
create policy place_visits_all on public.place_visits for all
  using (exists (select 1 from places p where p.id = place_id and p.pair_id = my_pair_id()))
  with check (exists (select 1 from places p where p.id = place_id and p.pair_id = my_pair_id()));

alter table public.push_subscriptions enable row level security;
create policy push_subscriptions_all on public.push_subscriptions for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
