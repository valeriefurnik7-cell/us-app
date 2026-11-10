-- Pet photos go to Telegram from the app again, the way "Send a test to Telegram" does (that one
-- always worked). The posting phone now waits until Telegram has the photo, so nothing gets lost.
-- The database trigger is switched off: it claimed each photo first and then failed to send it.
-- Run once in Supabase → SQL Editor (safe to re-run). Needs 0012.

drop trigger if exists forward_pet_photo on public.activity;

/**
 * For /api/telegram/forward called by one of us right after posting: who gets this post and what to
 * send. Only a member of the post's pair may ask. Each (post, chat) comes back once.
 */
create or replace function public.telegram_claim_post(post uuid)
returns table (chat_id bigint, author text, pets text, caption text, media jsonb)
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from cat_posts cp join profiles pr on pr.pair_id = cp.pair_id
    where cp.id = post and pr.id = auth.uid()
  ) then
    raise exception 'forbidden';
  end if;
  return query select * from public.telegram_post_to_forward((select value from private.settings where name = 'cron_secret'), post);
end $$;
revoke all on function public.telegram_claim_post(uuid) from public;
grant execute on function public.telegram_claim_post(uuid) to authenticated;
