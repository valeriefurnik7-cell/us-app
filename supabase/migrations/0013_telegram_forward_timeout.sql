-- The database used to give the app only 5 seconds (pg_net's default) to forward a pet photo
-- to Telegram — not enough to download it and upload it. Now it waits up to a minute.
-- Run once in Supabase → SQL Editor (safe to re-run).

create or replace function private.forward_pet_photo()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.kind = 'pet_photo' and new.target_id is not null then
    perform net.http_post(
      url := 'https://us-app-henna.vercel.app/api/telegram/forward',
      headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', (select value from private.settings where name = 'cron_secret')),
      body := jsonb_build_object('post_id', new.target_id),
      timeout_milliseconds := 60000
    );
  end if;
  return new;
end $$;
