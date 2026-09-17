-- Messenger Revival: authentication profile model + Display Picture storage

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default 'Messenger User',
  personal_message text not null default '',
  display_picture text not null default '',
  status text not null default 'online' check (status in ('online','busy','away','offline')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id,email,display_name)
  values (
    new.id,
    coalesce(new.email,''),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email,'Messenger User'),'@',1), 'Messenger User')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('display-pictures','display-pictures',true,5242880,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "display_pictures_insert_own" on storage.objects;
create policy "display_pictures_insert_own"
on storage.objects for insert
to authenticated
with check (bucket_id='display-pictures' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "display_pictures_update_own" on storage.objects;
create policy "display_pictures_update_own"
on storage.objects for update
to authenticated
using (bucket_id='display-pictures' and (storage.foldername(name))[1]=auth.uid()::text)
with check (bucket_id='display-pictures' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "display_pictures_delete_own" on storage.objects;
create policy "display_pictures_delete_own"
on storage.objects for delete
to authenticated
using (bucket_id='display-pictures' and (storage.foldername(name))[1]=auth.uid()::text);
