-- Push notifications. Run once in Supabase → SQL Editor (safe to re-run).

-- Per-person settings: which notifications, the "pet of the day" hour, default currency.
alter table public.profiles add column if not exists notify_prefs jsonb not null default '{}';
alter table public.profiles add column if not exists currency text not null default 'EUR';
grant update (name, avatar_url, city, lat, lon, timezone, birthday, notify_prefs, currency) on public.profiles to authenticated;

-- One row per device that allowed notifications. Only the owner can see or change it.
create unique index if not exists push_subscriptions_endpoint on public.push_subscriptions (endpoint);

-- The partner's devices, so the server can notify her when I do something.
-- (Endpoints only work together with our private VAPID key, which never leaves the server.)
create or replace function public.partner_push_targets()
returns table (endpoint text, keys jsonb, prefs jsonb)
language sql stable security definer set search_path = public
as $$
  select s.endpoint, s.keys, p.notify_prefs
  from push_subscriptions s
  join profiles p on p.id = s.profile_id
  where s.profile_id = partner_id()
$$;

create or replace function public.forget_push_endpoint(dead_endpoint text)
returns void
language sql security definer set search_path = public
as $$ delete from push_subscriptions where endpoint = dead_endpoint $$;

revoke all on function public.partner_push_targets() from public, anon;
revoke all on function public.forget_push_endpoint(text) from public, anon;
grant execute on function public.partner_push_targets() to authenticated;
grant execute on function public.forget_push_endpoint(text) to authenticated, anon;

-- ───────────── Scheduled notifications ─────────────

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.settings (name text primary key, value text not null);
insert into private.settings (name, value)
values ('cron_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (name) do nothing;

-- Remembers what was sent, so nothing goes out twice.
create table if not exists private.notification_log (
  key text primary key,
  sent_at timestamptz not null default now()
);

/**
 * Called every hour by the cron job below (through /api/cron). Returns the pushes that are due now:
 * pet of the day at each person's chosen hour, meeting in 7 days / tomorrow and her birthday in a week at 10:00 local.
 */
create or replace function public.due_notifications(secret text)
returns table (endpoint text, keys jsonb, title text, body text, url text)
language plpgsql security definer set search_path = public
as $$
begin
  if secret is distinct from (select value from private.settings where name = 'cron_secret') then
    raise exception 'forbidden';
  end if;

  return query
  with people as (
    select p.*, coalesce(p.timezone, 'Europe/Vienna') as tz,
           (now() at time zone coalesce(p.timezone, 'Europe/Vienna')) as local_now
    from profiles p
  ),
  candidates as (
    -- Pet of the day
    select pe.id as profile_id, 'pet:' || pe.id || ':' || pe.local_now::date as key,
           'Pet of the day' as title, 'Send today’s pet!' as body, '/pets' as url
    from people pe
    where coalesce((pe.notify_prefs ->> 'pet_of_day')::boolean, true)
      and extract(hour from pe.local_now) = coalesce((pe.notify_prefs ->> 'pet_hour')::int, 19)

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

-- Hourly job: Supabase calls the app, the app asks due_notifications() with the secret and sends the pushes.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('us-notifications') where exists (select 1 from cron.job where jobname = 'us-notifications');
select cron.schedule(
  'us-notifications',
  '0 * * * *',
  $cron$
    select net.http_post(
      url := 'https://us-app-henna.vercel.app/api/cron',
      headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', (select value from private.settings where name = 'cron_secret')),
      body := '{}'::jsonb
    )
  $cron$
);
