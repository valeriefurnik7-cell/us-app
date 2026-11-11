-- "It came true!" on a wish: fulfilled wishes leave the list and move to "Came true".
-- Run once in Supabase → SQL Editor (safe to re-run).
alter table public.gifts add column if not exists fulfilled_at timestamptz;
