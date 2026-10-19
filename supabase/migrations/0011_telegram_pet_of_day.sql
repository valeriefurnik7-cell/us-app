-- Pet of the day in Telegram: the winner's photo goes to friends who follow and to us, if connected.
-- Run once in Supabase → SQL Editor (safe to re-run). Needs 0008–0010.

/** True for the photo of a Pet of the day picked in the last day — only those may be signed by the cron job. */
create or replace function public.is_fresh_winner_photo(path text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from pet_of_day w join cat_post_media m on m.id = w.media_id
    where m.url = path and w.created_at > now() - interval '1 day'
  )
$$;
grant execute on function public.is_fresh_winner_photo(text) to anon, authenticated;

-- The cron job has no user, so it may link to just that one photo (signed, for 10 minutes) for Telegram.
drop policy if exists media_winner_for_telegram on storage.objects;
create policy media_winner_for_telegram on storage.objects for select to anon
  using (bucket_id = 'media' and public.is_fresh_winner_photo(name));

/**
 * Hourly from /api/cron: fresh winners not yet sent to a Telegram chat.
 * Each (winner, chat) comes back once — it's logged as sent right here.
 */
create or replace function public.telegram_due_winners(secret text)
returns table (chat_id bigint, photo text, media_type text, pet text, sender text, day date)
language plpgsql security definer set search_path = public
as $$
begin
  if secret is distinct from (select value from private.settings where name = 'cron_secret') then
    raise exception 'forbidden';
  end if;
  return query
  with chats as (
    select f.pair_id, f.chat_id from telegram_followers f
    union
    select pr.pair_id, l.chat_id from telegram_links l join profiles pr on pr.id = l.profile_id where l.chat_id is not null
  ),
  due as (
    select w.id, c.chat_id as chat, m.url, m.type, ct.name as pet_name, au.name as author, w.day as win_day
    from pet_of_day w
    join chats c on c.pair_id = w.pair_id
    join cat_post_media m on m.id = w.media_id
    join cat_posts p on p.id = w.post_id
    left join profiles au on au.id = p.author_id
    left join cats ct on ct.id = w.cat_id
    where w.created_at > now() - interval '2 hours'
  ),
  fresh as (
    insert into private.notification_log (key)
    select 'tg-winner:' || d.id || ':' || d.chat from due d
    on conflict (key) do nothing
    returning key
  )
  select d.chat, d.url, d.type, coalesce(nullif(trim(d.pet_name), ''), 'Unidentified pet'), d.author, d.win_day
  from due d join fresh f on f.key = 'tg-winner:' || d.id || ':' || d.chat;
end $$;

revoke all on function public.telegram_due_winners(text) from public;
grant execute on function public.telegram_due_winners(text) to anon, authenticated;
