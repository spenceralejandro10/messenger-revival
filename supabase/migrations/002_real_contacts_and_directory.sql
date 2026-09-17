-- Real authenticated user directory + per-account contacts
alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles for select to authenticated using (true);

create table if not exists public.contacts (
  owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, contact_id),
  check (owner_id <> contact_id)
);
alter table public.contacts enable row level security;
create policy "contacts_select_own" on public.contacts for select to authenticated using (auth.uid()=owner_id);
create policy "contacts_insert_own" on public.contacts for insert to authenticated with check (auth.uid()=owner_id);
create policy "contacts_delete_own" on public.contacts for delete to authenticated using (auth.uid()=owner_id);
create index if not exists profiles_email_lower_idx on public.profiles (lower(email));
create index if not exists profiles_display_name_lower_idx on public.profiles (lower(display_name));