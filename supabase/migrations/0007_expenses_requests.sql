-- Shared expenses (like Tricount), change requests, and who may edit what.
-- Run once in Supabase → SQL Editor (safe to re-run).

-- ───────────── Shared expenses ─────────────
-- One row per expense or settle-up. `shares` says how much of the amount is on each of us:
-- { "<profile_id>": 12.5, "<profile_id>": 12.5 }. A settle-up is an expense whose share is all on the receiver.
create table if not exists public.shared_expenses (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  paid_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  amount numeric not null check (amount > 0),
  currency text not null default 'EUR',
  shares jsonb not null,
  category text,
  spent_on date not null default current_date,
  trip_id uuid references public.trips (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  is_settlement boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists shared_expenses_pair on public.shared_expenses (pair_id, spent_on desc);

alter table public.shared_expenses enable row level security;
drop policy if exists shared_expenses_select on public.shared_expenses;
drop policy if exists shared_expenses_insert on public.shared_expenses;
drop policy if exists shared_expenses_update on public.shared_expenses;
drop policy if exists shared_expenses_delete on public.shared_expenses;
create policy shared_expenses_select on public.shared_expenses for select using (pair_id = my_pair_id());
create policy shared_expenses_insert on public.shared_expenses for insert with check (pair_id = my_pair_id() and created_by = auth.uid());
-- Both pay into the same pot, so both may fix a typo — like in Tricount.
create policy shared_expenses_update on public.shared_expenses for update using (pair_id = my_pair_id()) with check (pair_id = my_pair_id());
create policy shared_expenses_delete on public.shared_expenses for delete using (pair_id = my_pair_id());

-- ───────────── Change requests ─────────────
-- "Suggest a change" on something only the other one may edit.
create table if not exists public.change_requests (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  target_kind text not null check (target_kind in ('trip', 'event', 'dream', 'place')),
  target_id uuid not null,
  text text not null,
  status text not null default 'open' check (status in ('open', 'done', 'dismissed')),
  created_at timestamptz not null default now()
);
create index if not exists change_requests_target on public.change_requests (target_id);

alter table public.change_requests enable row level security;
drop policy if exists change_requests_select on public.change_requests;
drop policy if exists change_requests_insert on public.change_requests;
drop policy if exists change_requests_update on public.change_requests;
drop policy if exists change_requests_delete on public.change_requests;
create policy change_requests_select on public.change_requests for select using (pair_id = my_pair_id());
create policy change_requests_insert on public.change_requests for insert with check (pair_id = my_pair_id() and author_id = auth.uid());
create policy change_requests_update on public.change_requests for update using (pair_id = my_pair_id()) with check (pair_id = my_pair_id());
create policy change_requests_delete on public.change_requests for delete using (pair_id = my_pair_id() and author_id = auth.uid());

-- ───────────── Who may edit what ─────────────
-- Her solo trip is hers: I can look and suggest, not change. A shared trip belongs to both of us.
drop policy if exists trips_update on public.trips;
drop policy if exists trips_delete on public.trips;
create policy trips_update on public.trips for update
  using (pair_id = my_pair_id() and (author_id = auth.uid() or shared)) with check (pair_id = my_pair_id());
create policy trips_delete on public.trips for delete
  using (pair_id = my_pair_id() and author_id = auth.uid());

-- Places and checklists inside her solo trip are hers too.
drop policy if exists trip_stops_all on public.trip_stops;
drop policy if exists trip_stops_select on public.trip_stops;
drop policy if exists trip_stops_write on public.trip_stops;
create policy trip_stops_select on public.trip_stops for select
  using (exists (select 1 from trips t where t.id = trip_id and t.pair_id = my_pair_id()));
create policy trip_stops_write on public.trip_stops for all
  using (exists (select 1 from trips t where t.id = trip_id and t.pair_id = my_pair_id() and (t.author_id = auth.uid() or t.shared)))
  with check (exists (select 1 from trips t where t.id = trip_id and t.pair_id = my_pair_id() and (t.author_id = auth.uid() or t.shared)));

-- Plans: mine are mine; a meeting is ours, so either of us may change it.
drop policy if exists events_update on public.events;
drop policy if exists events_delete on public.events;
create policy events_update on public.events for update
  using (pair_id = my_pair_id() and (author_id = auth.uid() or type = 'meeting'))
  with check (pair_id = my_pair_id());
create policy events_delete on public.events for delete
  using (pair_id = my_pair_id() and (author_id = auth.uid() or type = 'meeting'));

-- Dreams: shared ones are ours; a personal dream belongs to its owner.
drop policy if exists dreams_update on public.dreams;
drop policy if exists dreams_delete on public.dreams;
create policy dreams_update on public.dreams for update
  using (pair_id = my_pair_id() and (owner_id is null or owner_id = auth.uid())) with check (pair_id = my_pair_id());
create policy dreams_delete on public.dreams for delete
  using (pair_id = my_pair_id() and (owner_id is null or owner_id = auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['shared_expenses', 'change_requests'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
