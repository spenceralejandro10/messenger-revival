-- Conversation rooms: replace standalone "groups" UX with participant-managed conversations.
-- The administrator/host is the participant who sent the first direct message
-- in the original 1:1 chat. If no direct message exists, the current user becomes host.

create or replace function public.direct_conversation_host(p_peer_id uuid)
returns uuid
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

  select m.sender_id into v_host
  from public.messages m
  where (m.sender_id=v_me and m.recipient_id=p_peer_id)
     or (m.sender_id=p_peer_id and m.recipient_id=v_me)
  order by m.created_at asc, m.id asc
  limit 1;

  return coalesce(v_host,v_me);
end;
$$;
revoke all on function public.direct_conversation_host(uuid) from public,anon;
grant execute on function public.direct_conversation_host(uuid) to authenticated;

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
  if p_peer_id in (v_me,p_invitee_id) or p_invitee_id=v_me then raise exception 'Participantes inválidos'; end if;
  if not exists(select 1 from public.contacts c where c.owner_id=v_me and c.contact_id=p_peer_id) then
    raise exception 'La conversación debe ser con un contacto';
  end if;

  v_host:=public.direct_conversation_host(p_peer_id);
  if v_host<>v_me then
    raise exception 'Solo el anfitrión de la conversación puede invitar participantes';
  end if;

  if not exists(
    select 1 from public.contacts c
    where c.owner_id in (v_me,p_peer_id) and c.contact_id=p_invitee_id
  ) then
    raise exception 'Solo puedes invitar contactos de alguno de los participantes';
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
  select created_by into v_host from public.group_conversations where id=p_conversation_id;
  if v_host is null or v_host<>v_me then
    raise exception 'Solo el administrador puede invitar participantes';
  end if;

  return query
  select distinct p.id,p.email,p.display_name,p.personal_message,p.display_picture,p.status
  from public.profiles p
  where not exists(
      select 1 from public.group_conversation_members gm
      where gm.conversation_id=p_conversation_id and gm.user_id=p.id
    )
    and exists(
      select 1
      from public.contacts c
      join public.group_conversation_members gm
        on gm.conversation_id=p_conversation_id and gm.user_id=c.owner_id
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
declare
  v_me uuid:=auth.uid();
  v_host uuid;
begin
  if v_me is null then raise exception 'No autenticado'; end if;
  select created_by into v_host from public.group_conversations where id=p_conversation_id;
  if v_host is null or v_host<>v_me then
    raise exception 'Solo el administrador puede invitar participantes';
  end if;

  if exists(
    select 1 from public.group_conversation_members gm
    where gm.conversation_id=p_conversation_id and gm.user_id=p_invitee_id
  ) then return; end if;

  if not exists(
    select 1
    from public.contacts c
    join public.group_conversation_members gm
      on gm.conversation_id=p_conversation_id and gm.user_id=c.owner_id
    where c.contact_id=p_invitee_id
  ) then
    raise exception 'Solo puedes invitar contactos de alguno de los participantes';
  end if;

  insert into public.group_conversation_members(conversation_id,user_id,invited_by)
  values(p_conversation_id,p_invitee_id,v_me);
end;
$$;
revoke all on function public.add_member_to_group(uuid,uuid) from public,anon;
grant execute on function public.add_member_to_group(uuid,uuid) to authenticated;

create or replace function public.remove_conversation_participant(p_conversation_id uuid,p_member_id uuid)
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
  select created_by into v_host from public.group_conversations where id=p_conversation_id;
  if v_host is null or v_host<>v_me then
    raise exception 'Solo el administrador puede eliminar participantes';
  end if;
  if p_member_id=v_host then
    raise exception 'El administrador no puede eliminarse de la conversación';
  end if;

  delete from public.group_conversation_members
  where conversation_id=p_conversation_id and user_id=p_member_id;
end;
$$;
revoke all on function public.remove_conversation_participant(uuid,uuid) from public,anon;
grant execute on function public.remove_conversation_participant(uuid,uuid) to authenticated;

create or replace function public.find_latest_conversation_room(p_peer_id uuid)
returns uuid
language sql
stable
security definer
set search_path=public
as $$
  select gc.id
  from public.group_conversations gc
  where exists(
    select 1 from public.group_conversation_members a
    where a.conversation_id=gc.id and a.user_id=auth.uid()
  )
  and exists(
    select 1 from public.group_conversation_members b
    where b.conversation_id=gc.id and b.user_id=p_peer_id
  )
  and (
    select count(*) from public.group_conversation_members m
    where m.conversation_id=gc.id
  ) > 2
  order by gc.created_at desc
  limit 1;
$$;
revoke all on function public.find_latest_conversation_room(uuid) from public,anon;
grant execute on function public.find_latest_conversation_room(uuid) to authenticated;
