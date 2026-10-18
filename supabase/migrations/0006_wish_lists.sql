-- Wishlist like Ohmywishes: wishes sorted into lists, and secret wishes only the owner sees.
-- Run once in Supabase → SQL Editor (safe to re-run).

alter table public.gifts add column if not exists list text;
alter table public.gifts add column if not exists is_secret boolean not null default false;

-- A secret wish never reaches the partner, not even through the API.
drop policy if exists gifts_select on public.gifts;
create policy gifts_select on public.gifts for select
  using (pair_id = my_pair_id() and (not is_secret or wisher_id = auth.uid()));

drop policy if exists gifts_update on public.gifts;
create policy gifts_update on public.gifts for update
  using (pair_id = my_pair_id() and (not is_secret or wisher_id = auth.uid()))
  with check (pair_id = my_pair_id());

drop policy if exists gifts_delete on public.gifts;
create policy gifts_delete on public.gifts for delete
  using (pair_id = my_pair_id() and (not is_secret or wisher_id = auth.uid()));
