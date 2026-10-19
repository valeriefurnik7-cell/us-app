-- Telegram followers: friends who aren't in the app get the pet photos from the chat through the bot.
-- Run once in Supabase → SQL Editor (safe to re-run).

-- One link = one friend; the code is used up when they tap Start.
create table if not exists public.telegram_invites (
  code text primary key,
  pair_id uuid not null references public.pairs (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.telegram_followers (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  chat_id bigint not null,
  name text,
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (pair_id, chat_id)
);

alter table public.telegram_invites enable row level security;
alter table public.telegram_followers enable row level security;

drop policy if exists telegram_invites_pair on public.telegram_invites;
create policy telegram_invites_pair on public.telegram_invites for all
  using (pair_id = my_pair_id()) with check (pair_id = my_pair_id() and created_by = auth.uid());

-- Both of us see who follows and can remove anyone; only the bot adds followers.
drop policy if exists telegram_followers_select on public.telegram_followers;
create policy telegram_followers_select on public.telegram_followers for select using (pair_id = my_pair_id());
drop policy if exists telegram_followers_delete on public.telegram_followers;
create policy telegram_followers_delete on public.telegram_followers for delete using (pair_id = my_pair_id());

/** Bot webhook: "/start f_<code>" → this chat follows the pair's pets. Returns the pair's name. */
create or replace function public.telegram_follow(code text, chat bigint, follower_name text)
returns text
language plpgsql security definer set search_path = public
as $$
declare inv telegram_invites;
begin
  if code is null or length(code) < 20 then return null; end if;
  delete from telegram_invites where telegram_invites.code = telegram_follow.code returning * into inv;
  if inv.pair_id is null then return null; end if;
  insert into telegram_followers (pair_id, chat_id, name, invited_by)
  values (inv.pair_id, chat, left(follower_name, 80), inv.created_by)
  on conflict (pair_id, chat_id) do update set name = excluded.name;
  return (select coalesce(nullif(name, ''), 'Us') from pairs where id = inv.pair_id);
end $$;

/** Bot webhook: "/stop" → also stop following. */
create or replace function public.telegram_unlink(chat bigint)
returns void
language sql security definer set search_path = public
as $$
  delete from telegram_links where chat_id = chat;
  delete from telegram_followers where chat_id = chat;
$$;

revoke all on function public.telegram_follow(text, bigint, text) from public;
grant execute on function public.telegram_follow(text, bigint, text) to anon, authenticated;
grant execute on function public.telegram_unlink(bigint) to anon, authenticated;
