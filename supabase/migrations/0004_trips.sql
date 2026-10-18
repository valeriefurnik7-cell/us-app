-- Trips: places inside a trip, and trips/quick marks shown in the calendar automatically.
-- Run once in Supabase → SQL Editor (safe to re-run).

create table if not exists public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  title text not null,
  visited boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.trip_stops enable row level security;
drop policy if exists trip_stops_all on public.trip_stops;
create policy trip_stops_all on public.trip_stops for all
  using (exists (select 1 from trips t where t.id = trip_id and t.pair_id = my_pair_id()))
  with check (exists (select 1 from trips t where t.id = trip_id and t.pair_id = my_pair_id()));

-- Calendar = events + trips + quick "where I was" marks. `source` tells the app where a row came from.
drop function if exists public.pair_events(timestamptz, timestamptz);
create function public.pair_events(range_start timestamptz, range_end timestamptz)
returns table (
  id uuid,
  author_id uuid,
  title text,
  type text,
  start timestamptz,
  "end" timestamptz,
  all_day boolean,
  city text,
  note text,
  is_private boolean,
  masked boolean,
  source text
)
language sql stable security definer set search_path = public
as $$
  select
    e.id,
    e.author_id,
    case when e.is_private and e.author_id <> auth.uid() then 'Busy' else e.title end,
    case when e.is_private and e.author_id <> auth.uid() then 'busy' else e.type end,
    e.start,
    e."end",
    e.all_day,
    case when e.is_private and e.author_id <> auth.uid() then null else e.city end,
    case when e.is_private and e.author_id <> auth.uid() then null else e.note end,
    e.is_private,
    e.is_private and e.author_id <> auth.uid(),
    'event'
  from events e
  where e.pair_id = my_pair_id()
    and e.start < range_end
    and coalesce(e."end", e.start) >= range_start

  union all

  select t.id, t.author_id, t.destination, 'trip', t.start::timestamptz, t."end"::timestamptz, true,
         t.destination, null, false, false, 'trip'
  from trips t
  where t.pair_id = my_pair_id()
    and t.start is not null
    and t.start::timestamptz < range_end
    and coalesce(t."end", t.start)::timestamptz >= range_start

  union all

  select q.id, q.profile_id, q.city, 'trip', q.start::timestamptz, q."end"::timestamptz, true,
         q.city, null, false, false, 'quick_trip'
  from quick_trips q
  where q.pair_id = my_pair_id()
    and q.start is not null
    and q.start::timestamptz < range_end
    and coalesce(q."end", q.start)::timestamptz >= range_start

  order by 5
$$;

revoke all on function public.pair_events(timestamptz, timestamptz) from public, anon;
grant execute on function public.pair_events(timestamptz, timestamptz) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['trips', 'trip_stops', 'trip_budgets', 'trip_expenses', 'trip_packing', 'quick_trips'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
