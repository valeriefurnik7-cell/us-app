-- Stage 3: photo & video storage for the cat feed, and live updates between the two phones.
-- Run once in Supabase → SQL Editor.

-- Private bucket; every file lives under "<pair_id>/…" so a pair only reaches its own files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 52428800, array['image/*', 'video/*'])
on conflict (id) do nothing;

drop policy if exists media_select on storage.objects;
create policy media_select on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = public.my_pair_id()::text);
drop policy if exists media_insert on storage.objects;
create policy media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = public.my_pair_id()::text);
drop policy if exists media_delete on storage.objects;
create policy media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = public.my_pair_id()::text and owner = auth.uid());

-- Realtime: a new post on one phone shows up on the other without reloading.
-- (skips tables that are already published, so the script can be re-run)
do $$
declare t text;
begin
  foreach t in array array['cat_posts', 'cat_post_media', 'reactions', 'comments', 'cats'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
