-- Invite UI: show only the administrator's own contacts that are not already in the conversation.
-- Also fixes the ambiguous unqualified "id" reference in get_group_invite_candidates.

create or replace function public.get_direct_invite_candidates(p_peer_id uuid)
returns table(id uuid,email text,display_name text,personal_message text,display_picture text,status text)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_me uuid:=auth.uid();
  v_host uuid;
begin
  if v_me is null then raise exception 'No autenticado'; end if;
  if p_peer_id is null or p_peer_id=v_me then raise exception 'Participante inválido'; end if;
  if not exists(select 1 from public.contacts c where c.owner_id=v_me and c.contact_id=p_peer_id) then
    raise exception 'La conversación debe ser con un contacto';
  end if;

  v_host:=public.direct_conversation_host(p_peer_id);
  if v_host<>v_me then raise exception 'Solo el administrador puede invitar participantes'; end if;

  return query
  select p.id,p.email,p.display_name,p.personal_message,p.display_picture,p.status
  from public.contacts c
  join public.profiles p on p.id=c.contact_id
  where c.owner_id=v_me and p.id<>p_peer_id and p.id<>v_me
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
declare
  v_me uuid:=auth.uid();
  v_host uuid;
  v_room uuid;
begin
  if v_me is null then raise exception 'No autenticado'; end if;
  if p_peer_id is null or p_invitee_id is null or p_peer_id in (v_me,p_invitee_id) or p_invitee_id=v_me then
    raise exception 'Participantes inválidos';
  end if;
  if not exists(select 1 from public.contacts c where c.owner_id=v_me and c.contact_id=p_peer_id) then
    raise exception 'La conversación debe ser con un contacto';
  end if;

  v_host:=public.direct_conversation_host(p_peer_id);
  if v_host<>v_me then raise exception 'Solo el administrador puede invitar participantes'; end if;

  if not exists(select 1 from public.contacts c where c.owner_id=v_me and c.contact_id=p_invitee_id) then
    raise exception 'Solo puedes invitar personas de tu lista de contactos';
  end if;

  insert into public.group_conversations(created_by,title)
  values(v_host,'') returning id into v_room;

  insert into public.group_conversation_members(conversation_id,user_id,invited_by) values
    (v_room,v_host,v_host),
    (v_room,p_peer_id,v_host),
    (v_room,p_invitee_id,v_host);

  return v_room;
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
declare
  v_me uuid:=auth.uid();
  v_host uuid;
begin
  if v_me is null then raise exception 'No autenticado'; end if;

  select gc.created_by into v_host
  from public.group_conversations gc
  where gc.id=p_conversation_id;

  if v_host is null or v_host<>v_me then raise exception 'Solo el administrador puede invitar participantes'; end if;

  return query
  select p.id,p.email,p.display_name,p.personal_message,p.display_picture,p.status
  from public.contacts c
  join public.profiles p on p.id=c.contact_id
  where c.owner_id=v_me
    and not exists(
      select 1 from public.group_conversation_members gm
      where gm.conversation_id=p_conversation_id and gm.user_id=p.id
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
declare
  v_me uuid:=auth.uid();
  v_host uuid;
begin
  if v_me is null then raise exception 'No autenticado'; end if;

  select gc.created_by into v_host
  from public.group_conversations gc
  where gc.id=p_conversation_id;

  if v_host is null or v_host<>v_me then raise exception 'Solo el administrador puede invitar participantes'; end if;

  if exists(
    select 1 from public.group_conversation_members gm
    where gm.conversation_id=p_conversation_id and gm.user_id=p_invitee_id
  ) then return; end if;

  if not exists(select 1 from public.contacts c where c.owner_id=v_me and c.contact_id=p_invitee_id) then
    raise exception 'Solo puedes invitar personas de tu lista de contactos';
  end if;

  insert into public.group_conversation_members(conversation_id,user_id,invited_by)
  values(p_conversation_id,p_invitee_id,v_me);
end;
$$;
revoke all on function public.add_member_to_group(uuid,uuid) from public,anon;
grant execute on function public.add_member_to_group(uuid,uuid) to authenticated;