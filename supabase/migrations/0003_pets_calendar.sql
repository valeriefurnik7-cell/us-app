-- Pets (not only cats) and the shared calendar.
-- Run once in Supabase → SQL Editor.

-- A pet can be a cat, a dog or someone else. Table keeps its name "cats" so earlier data stays.
alter table public.cats add column if not exists species text not null default 'cat'
  check (species in ('cat', 'dog', 'other'));

-- Calendar for the pair. The partner's private events come back as "Busy" with dates only,
-- so the details never leave the database.
create or replace function public.pair_events(range_start timestamptz, range_end timestamptz)
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
  masked boolean
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
    e.is_private and e.author_id <> auth.uid()
  from events e
  where e.pair_id = my_pair_id()
    and e.start < range_end
    and coalesce(e."end", e.start) >= range_start
  order by e.start
$$;

revoke all on function public.pair_events(timestamptz, timestamptz) from public, anon;
grant execute on function public.pair_events(timestamptz, timestamptz) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['events', 'profiles'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
