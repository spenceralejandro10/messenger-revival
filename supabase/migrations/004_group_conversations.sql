-- Multiparty Messenger conversations. Invitees must be contacts of at least one current participant.
create table if not exists public.group_conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.group_conversation_members (
  conversation_id uuid not null references public.group_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (conversation_id,user_id)
);

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.group_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'text' check (kind in ('text','emoji','nudge')),
  body text not null default '',
  format jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists group_members_user_idx on public.group_conversation_members(user_id,joined_at desc);
create index if not exists group_messages_conversation_created_idx on public.group_messages(conversation_id,created_at);

alter table public.group_conversations enable row level security;
alter table public.group_conversation_members enable row level security;
alter table public.group_messages enable row level security;

create or replace function public.is_group_member(p_conversation_id uuid,p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.group_conversation_members m
    where m.conversation_id=p_conversation_id and m.user_id=p_user_id
  );
$$;
revoke all on function public.is_group_member(uuid,uuid) from public,anon;
grant execute on function public.is_group_member(uuid,uuid) to authenticated;

drop policy if exists "group_conversations_select_members" on public.group_conversations;
create policy "group_conversations_select_members" on public.group_conversations
for select to authenticated using (public.is_group_member(id,auth.uid()));

drop policy if exists "group_members_select_members" on public.group_conversation_members;
create policy "group_members_select_members" on public.group_conversation_members
for select to authenticated using (public.is_group_member(conversation_id,auth.uid()));

drop policy if exists "group_messages_select_members" on public.group_messages;
create policy "group_messages_select_members" on public.group_messages
for select to authenticated using (public.is_group_member(conversation_id,auth.uid()));

drop policy if exists "group_messages_insert_members" on public.group_messages;
create policy "group_messages_insert_members" on public.group_messages
for insert to authenticated with check (sender_id=auth.uid() and public.is_group_member(conversation_id,auth.uid()));

grant select on public.group_conversations to authenticated;
grant select on public.group_conversation_members to authenticated;
grant select,insert on public.group_messages to authenticated;

create or replace function public.get_direct_invite_candidates(p_peer_id uuid)
returns table(id uuid,email text,display_name text,personal_message text,display_picture text,status text)
language plpgsql
security definer
set search_path=public
as $$
declare v_me uuid:=auth.uid();
begin
  if v_me is null then raise exception 'No autenticado'; end if;
  if p_peer_id=v_me or not exists(select 1 from public.contacts c where c.owner_id=v_me and c.contact_id=p_peer_id) then
    raise exception 'La conversación debe ser con un contacto';
  end if;
  return query
  select distinct p.id,p.email,p.display_name,p.personal_message,p.display_picture,p.status
  from public.profiles p
  where p.id not in (v_me,p_peer_id)
    and exists(
      select 1 from public.contacts c
      where c.owner_id in (v_me,p_peer_id) and c.contact_id=p.id
    )
  order by p.display_name,p.email;
end;
$$;
revoke all on function public.get_direct_invite_candidates(uuid) from public,anon;
grant execute on function public.get_direct_invite_candidates(uuid) to authenticated;

create or replace function public.create_group_from_direct(p_peer_id uuid,p_invitee_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare v_me uuid:=auth.uid();v_group uuid;
begin
  if v_me is null then raise exception 'No autenticado'; end if;
  if p_peer_id in (v_me,p_invitee_id) or p_invitee_id=v_me then raise exception 'Participantes inválidos'; end if;
  if not exists(select 1 from public.contacts c where c.owner_id=v_me and c.contact_id=p_peer_id) then
    raise exception 'La conversación debe ser con un contacto';
  end if;
  if not exists(
    select 1 from public.contacts c
    where c.owner_id in (v_me,p_peer_id) and c.contact_id=p_invitee_id
  ) then raise exception 'Solo puedes invitar contactos de alguno de los participantes'; end if;
  insert into public.group_conversations(created_by) values(v_me) returning id into v_group;
  insert into public.group_conversation_members(conversation_id,user_id,invited_by) values
    (v_group,v_me,v_me),(v_group,p_peer_id,v_me),(v_group,p_invitee_id,v_me);
  return v_group;
end;
$$;
revoke all on function public.create_group_from_direct(uuid,uuid) from public,anon;
grant execute on function public.create_group_from_direct(uuid,uuid) to authenticated;

create or replace function public.get_group_invite_candidates(p_conversation_id uuid)
returns table(id uuid,email text,display_name text,personal_message text,display_picture text,status text)
language plpgsql
security definer
set search_path=public
as $$
declare v_me uuid:=auth.uid();
begin
  if v_me is null or not public.is_group_member(p_conversation_id,v_me) then raise exception 'No autorizado'; end if;
  return query
  select distinct p.id,p.email,p.display_name,p.personal_message,p.display_picture,p.status
  from public.profiles p
  where not exists(select 1 from public.group_conversation_members gm where gm.conversation_id=p_conversation_id and gm.user_id=p.id)
    and exists(
      select 1
      from public.contacts c
      join public.group_conversation_members gm on gm.conversation_id=p_conversation_id and gm.user_id=c.owner_id
      where c.contact_id=p.id
    )
  order by p.display_name,p.email;
end;
$$;
revoke all on function public.get_group_invite_candidates(uuid) from public,anon;
grant execute on function public.get_group_invite_candidates(uuid) to authenticated;

create or replace function public.add_member_to_group(p_conversation_id uuid,p_invitee_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare v_me uuid:=auth.uid();
begin
  if v_me is null or not public.is_group_member(p_conversation_id,v_me) then raise exception 'No autorizado'; end if;
  if exists(select 1 from public.group_conversation_members gm where gm.conversation_id=p_conversation_id and gm.user_id=p_invitee_id) then return; end if;
  if not exists(
    select 1
    from public.contacts c
    join public.group_conversation_members gm on gm.conversation_id=p_conversation_id and gm.user_id=c.owner_id
    where c.contact_id=p_invitee_id
  ) then raise exception 'Solo puedes invitar contactos de alguno de los participantes'; end if;
  insert into public.group_conversation_members(conversation_id,user_id,invited_by)
  values(p_conversation_id,p_invitee_id,v_me);
end;
$$;
revoke all on function public.add_member_to_group(uuid,uuid) from public,anon;
grant execute on function public.add_member_to_group(uuid,uuid) to authenticated;

do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='group_messages') then
    alter publication supabase_realtime add table public.group_messages;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='group_conversation_members') then
    alter publication supabase_realtime add table public.group_conversation_members;
  end if;
end
$$;
