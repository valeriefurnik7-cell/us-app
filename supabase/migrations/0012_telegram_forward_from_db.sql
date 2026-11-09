-- Pet photos go to Telegram straight from the database, not from the phone that posted them
-- (a closed app or a dropped request used to lose them). Same path as Pet of the day.
-- Run once in Supabase → SQL Editor (safe to re-run). Needs 0009–0011.

/** True for a photo posted in the last 30 minutes — only those may be signed for Telegram without a user. */
create or replace function public.is_fresh_post_media(path text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from cat_post_media m join cat_posts p on p.id = m.post_id
    where m.url = path and p.created_at > now() - interval '30 minutes'
  )
$$;
grant execute on function public.is_fresh_post_media(text) to anon, authenticated;

drop policy if exists media_fresh_post_for_telegram on storage.objects;
create policy media_fresh_post_for_telegram on storage.objects for select to anon
  using (bucket_id = 'media' and public.is_fresh_post_media(name));

/**
 * For /api/telegram/forward: who gets this post and what to send. Followers, plus the other one of us
 * if she connected the bot. Each (post, chat) comes back once — logged as sent right here.
 */
create or replace function public.telegram_post_to_forward(secret text, post uuid)
returns table (chat_id bigint, author text, pets text, caption text, media jsonb)
language plpgsql security definer set search_path = public
as $$
begin
  if secret is distinct from (select value from private.settings where name = 'cron_secret') then
    raise exception 'forbidden';
  end if;
  return query
  with p as (
    select cp.* from cat_posts cp where cp.id = post
  ),
  chats as (
    select f.chat_id as chat from telegram_followers f join p on f.pair_id = p.pair_id
    union
    select l.chat_id from telegram_links l join profiles pr on pr.id = l.profile_id join p on pr.pair_id = p.pair_id
    where l.chat_id is not null and l.profile_id <> p.author_id
  ),
  fresh as (
    insert into private.notification_log (key)
    select 'tg-post:' || post || ':' || c.chat from chats c
    on conflict (key) do nothing
    returning key
  )
  select c.chat,
         (select name from profiles where id = p.author_id),
         (select string_agg(nullif(trim(ct.name), ''), ' & ') from cat_post_cats pc join cats ct on ct.id = pc.cat_id where pc.post_id = post),
         p.caption,
         (select coalesce(jsonb_agg(jsonb_build_object('url', m.url, 'type', m.type) order by m."order"), '[]') from cat_post_media m where m.post_id = post)
  from chats c cross join p
  join fresh f on f.key = 'tg-post:' || post || ':' || c.chat;
end $$;
revoke all on function public.telegram_post_to_forward(text, uuid) from public;
grant execute on function public.telegram_post_to_forward(text, uuid) to anon, authenticated;

/** The app logs a 'pet_photo' activity after the photos and pet tags are saved — that's our cue. */
create or replace function private.forward_pet_photo()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.kind = 'pet_photo' and new.target_id is not null then
    perform net.http_post(
      url := 'https://us-app-henna.vercel.app/api/telegram/forward',
      headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', (select value from private.settings where name = 'cron_secret')),
      body := jsonb_build_object('post_id', new.target_id)
    );
  end if;
  return new;
end $$;

drop trigger if exists forward_pet_photo on public.activity;
create trigger forward_pet_photo after insert on public.activity
  for each row execute function private.forward_pet_photo();
