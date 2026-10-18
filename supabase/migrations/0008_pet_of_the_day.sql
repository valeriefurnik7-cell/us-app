-- Pet of the day: a reminder when nobody has sent a pet yet, and a random winner at 22:00.
-- Run once in Supabase → SQL Editor (safe to re-run). It replaces due_notifications() from 0005.

create table if not exists public.pet_of_day (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  day date not null,
  media_id uuid not null references public.cat_post_media (id) on delete cascade,
  post_id uuid not null references public.cat_posts (id) on delete cascade,
  cat_id uuid references public.cats (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (pair_id, day)
);

alter table public.pet_of_day enable row level security;
drop policy if exists pet_of_day_select on public.pet_of_day;
create policy pet_of_day_select on public.pet_of_day for select using (pair_id = my_pair_id());
-- Winners are picked by the database only (due_notifications), never written by the app.

/**
 * Hourly (cron → /api/cron → here). Returns the pushes due now:
 *  - at each person's pet hour: "send 2 photos each" if the pair has no pet photo yet today
 *  - at 22:00 (the pair creator's time): picks a random photo of the day as Pet of the day, tells both
 *  - meeting in 7 days / tomorrow and her birthday in a week, at 10:00 local
 */
create or replace function public.due_notifications(secret text)
returns table (endpoint text, keys jsonb, title text, body text, url text)
language plpgsql security definer set search_path = public
as $$
begin
  if secret is distinct from (select value from private.settings where name = 'cron_secret') then
    raise exception 'forbidden';
  end if;

  -- ── Pick today's winners first (22:00 in the pair creator's time zone) ──
  insert into pet_of_day (pair_id, day, media_id, post_id, cat_id)
  select distinct on (pr.id)
    pr.id,
    (now() at time zone coalesce(c.timezone, 'Europe/Vienna'))::date,
    m.id,
    p.id,
    (select pc.cat_id from cat_post_cats pc where pc.post_id = p.id limit 1)
  from pairs pr
  join profiles c on c.id = pr.created_by
  join cat_posts p on p.pair_id = pr.id
  join cat_post_media m on m.post_id = p.id and m.type = 'photo'
  where extract(hour from now() at time zone coalesce(c.timezone, 'Europe/Vienna')) = 22
    and (p.created_at at time zone coalesce(c.timezone, 'Europe/Vienna'))::date = (now() at time zone coalesce(c.timezone, 'Europe/Vienna'))::date
  order by pr.id, random()
  on conflict (pair_id, day) do nothing;

  return query
  with people as (
    select p.*, coalesce(p.timezone, 'Europe/Vienna') as tz,
           (now() at time zone coalesce(p.timezone, 'Europe/Vienna')) as local_now
    from profiles p
  ),
  candidates as (
    -- Nobody has sent a pet today → nudge both
    select pe.id as profile_id, 'pet-nudge:' || pe.id || ':' || pe.local_now::date as key,
           'Pet of the day' as title, 'No pets today yet — send 2 photos each!' as body, '/pets' as url
    from people pe
    where coalesce((pe.notify_prefs ->> 'pet_of_day')::boolean, true)
      and extract(hour from pe.local_now) = coalesce((pe.notify_prefs ->> 'pet_hour')::int, 19)
      and not exists (
        select 1 from cat_posts cp
        join cat_post_media cm on cm.post_id = cp.id and cm.type = 'photo'
        where cp.pair_id = pe.pair_id and (cp.created_at at time zone pe.tz)::date = pe.local_now::date
      )

    union all
    -- Tonight's winner → tell both
    select pe.id, 'pet-winner:' || w.id || ':' || pe.id,
           'Pet of the day',
           coalesce(ct.name, 'Your pet') || ' is the pet of the day!',
           '/pets/hall'
    from pet_of_day w
    join people pe on pe.pair_id = w.pair_id
    left join cats ct on ct.id = w.cat_id
    where coalesce((pe.notify_prefs ->> 'pet_of_day')::boolean, true)
      and w.created_at > now() - interval '2 hours'

    union all
    -- Meeting in 7 days / tomorrow, at 10:00 local
    select pe.id, 'meet:' || e.id || ':' || (e.start::date - pe.local_now::date) || ':' || pe.id,
           'Us',
           case when e.start::date - pe.local_now::date = 1 then 'See you tomorrow!' else '7 days until we meet' end,
           '/'
    from people pe
    join events e on e.pair_id = pe.pair_id and e.type = 'meeting'
    where coalesce((pe.notify_prefs ->> 'meeting_soon')::boolean, true)
      and extract(hour from pe.local_now) = 10
      and (e.start at time zone pe.tz)::date - pe.local_now::date in (1, 7)

    union all
    -- Her birthday in a week, at 10:00 local
    select pe.id, 'bday:' || her.id || ':' || extract(year from pe.local_now) || ':' || pe.id,
           'Birthday soon', her.name || '’s birthday is in a week — is the gift ready?', '/wishlist'
    from people pe
    join profiles her on her.pair_id = pe.pair_id and her.id <> pe.id and her.birthday is not null
    where coalesce((pe.notify_prefs ->> 'birthday')::boolean, true)
      and extract(hour from pe.local_now) = 10
      and to_char(her.birthday, 'MM-DD') = to_char(pe.local_now::date + 7, 'MM-DD')
  ),
  fresh as (
    insert into private.notification_log (key)
    select c.key from candidates c
    on conflict (key) do nothing
    returning key
  )
  select s.endpoint, s.keys, c.title, c.body, c.url
  from candidates c
  join fresh f on f.key = c.key
  join push_subscriptions s on s.profile_id = c.profile_id;
end $$;

revoke all on function public.due_notifications(text) from public;
grant execute on function public.due_notifications(text) to anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pet_of_day') then
    alter publication supabase_realtime add table public.pet_of_day;
  end if;
end $$;
