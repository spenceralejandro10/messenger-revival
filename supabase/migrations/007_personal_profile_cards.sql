-- Personal MSN-style profile card details. Sensitive fields are only readable
-- by the owner or one of their accepted contacts.
create table if not exists public.profile_details (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age smallint,
  gender text not null default 'prefer_not_say',
  orientation text not null default 'prefer_not_say',
  nationality text not null default '',
  interests text not null default '',
  looking_for text not null default 'not_looking',
  updated_at timestamptz not null default now(),
  constraint profile_details_age_check check (age is null or age between 13 and 120),
  constraint profile_details_gender_check check (gender in ('woman','man','nonbinary','other','prefer_not_say')),
  constraint profile_details_orientation_check check (orientation in ('heterosexual','gay','lesbian','bisexual','pansexual','asexual','other','prefer_not_say')),
  constraint profile_details_looking_for_check check (looking_for in ('friends','relationship','casual','chat','not_looking','mystery')),
  constraint profile_details_nationality_length check (char_length(nationality) <= 80),
  constraint profile_details_interests_length check (char_length(interests) <= 300)
);

alter table public.profile_details enable row level security;

drop policy if exists "profile_details_select_self_or_contact" on public.profile_details;
create policy "profile_details_select_self_or_contact"
on public.profile_details for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.contacts c
    where (c.owner_id = auth.uid() and c.contact_id = profile_details.user_id)
       or (c.owner_id = profile_details.user_id and c.contact_id = auth.uid())
  )
);

drop policy if exists "profile_details_insert_own" on public.profile_details;
create policy "profile_details_insert_own"
on public.profile_details for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "profile_details_update_own" on public.profile_details;
create policy "profile_details_update_own"
on public.profile_details for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on public.profile_details to authenticated;
