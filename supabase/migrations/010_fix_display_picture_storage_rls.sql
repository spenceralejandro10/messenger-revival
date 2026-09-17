-- Fix display-picture uploads performed with upsert=true.
-- Supabase Storage upserts require SELECT in addition to INSERT and UPDATE.
drop policy if exists "display_pictures_select_own" on storage.objects;

create policy "display_pictures_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'display-pictures'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
