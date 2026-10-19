-- Telegram bot: pet photos from the chat also arrive in Telegram, to whoever connected the bot.
-- Run once in Supabase → SQL Editor (safe to re-run).

create table if not exists public.telegram_links (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  link_code text unique,          -- one-time code in the t.me/<bot>?start=<code> link
  chat_id bigint unique,          -- set by the bot once she taps Start
  created_at timestamptz not null default now()
);

alter table public.telegram_links enable row level security;
-- Only my own row; the partner never sees my Telegram chat.
drop policy if exists telegram_links_own on public.telegram_links;
create policy telegram_links_own on public.telegram_links for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

/** Bot webhook: "/start <code>" → remember this chat for the profile that made the code. */
create or replace function public.telegram_link(code text, chat bigint)
returns text
language plpgsql security definer set search_path = public
as $$
declare who uuid;
begin
  if code is null or length(code) < 20 then return null; end if;
  delete from telegram_links where chat_id = chat and link_code is distinct from code;
  update telegram_links set chat_id = chat, link_code = null where link_code = code returning profile_id into who;
  return (select name from profiles where id = who);
end $$;

/** Bot webhook: "/stop" → forget this chat. */
create or replace function public.telegram_unlink(chat bigint)
returns void
language sql security definer set search_path = public
as $$ delete from telegram_links where chat_id = chat $$;

/** Where to send my pet photos: the partner's Telegram chat, if she connected one. */
create or replace function public.partner_telegram_chat()
returns bigint
language sql stable security definer set search_path = public
as $$ select chat_id from telegram_links where profile_id = partner_id() $$;

revoke all on function public.telegram_link(text, bigint) from public;
revoke all on function public.telegram_unlink(bigint) from public;
revoke all on function public.partner_telegram_chat() from public, anon;
grant execute on function public.telegram_link(text, bigint) to anon, authenticated;
grant execute on function public.telegram_unlink(bigint) to anon, authenticated;
grant execute on function public.partner_telegram_chat() to authenticated;
