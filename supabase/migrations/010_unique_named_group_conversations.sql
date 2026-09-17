-- Prevent duplicate group conversations with the exact same participant set,
-- merge legacy duplicates, allow a group title, and permit the creator to rename it.
alter table public.group_conversations
  add column if not exists member_signature text not null default '';

create temporary table tmp_group_signatures on commit drop as
select
  g.id,
  g.created_at,
  md5(string_agg(m.user_id::text, ',' order by m.user_id::text)) as signature
from public.group_conversations g
join public.group_conversation_members m on m.conversation_id = g.id
group by g.id, g.created_at;

create temporary table tmp_group_duplicates on commit drop as
select
  id,
  signature,
  first_value(id) over (partition by signature order by created_at, id) as keeper_id
from tmp_group_signatures;

update public.group_messages gm
set conversation_id = d.keeper_id
from tmp_group_duplicates d
where gm.conversation_id = d.id
  and d.id <> d.keeper_id;

delete from public.group_conversation_members gm
using tmp_group_duplicates d
where gm.conversation_id = d.id
  and d.id <> d.keeper_id;

delete from public.group_conversations g
using tmp_group_duplicates d
where g.id = d.id
  and d.id <> d.keeper_id;

update public.group_conversations g
set member_signature = s.signature
from tmp_group_signatures s
where g.id = s.id;

create unique index if not exists group_conversations_member_signature_unique
on public.group_conversations(member_signature)
where member_signature <> '';

drop function if exists public.create_group_from_direct(uuid,uuid);
drop function if exists public.create_group_from_direct(uuid,uuid,text);

create function public.create_group_from_direct(
  p_peer_id uuid,
  p_invitee_id uuid,
  p_title text default ''
)
returns table(conversation_id uuid, created boolean)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_me uuid:=auth.uid();
  v_group uuid;
  v_signature text;
  v_title text:=left(trim(coalesce(p_title,'')),60);
begin
  if v_me is null then raise exception 'No autenticado'; end if;
  if p_peer_id in (v_me,p_invitee_id) or p_invitee_id=v_me then
    raise exception 'Participantes inválidos';
  end if;
  if not exists(
    select 1 from public.contacts c
    where c.owner_id=v_me and c.contact_id=p_peer_id
  ) then
    raise exception 'La conversación debe ser con un contacto';
  end if;
  if not exists(
    select 1 from public.contacts c
    where c.owner_id in (v_me,p_peer_id) and c.contact_id=p_invitee_id
  ) then
    raise exception 'Solo puedes invitar contactos de alguno de los participantes';
  end if;

  select md5(string_agg(x::text, ',' order by x::text))
    into v_signature
  from unnest(array[v_me,p_peer_id,p_invitee_id]) as x;

  select g.id into v_group
  from public.group_conversations g
  where g.member_signature=v_signature
  limit 1;

  if v_group is not null then
    return query select v_group,false;
    return;
  end if;

  insert into public.group_conversations(created_by,title,member_signature)
  values(v_me,v_title,v_signature)
  returning id into v_group;

  insert into public.group_conversation_members(conversation_id,user_id,invited_by)
  values
    (v_group,v_me,v_me),
    (v_group,p_peer_id,v_me),
    (v_group,p_invitee_id,v_me);

  return query select v_group,true;
exception
  when unique_violation then
    select g.id into v_group
    from public.group_conversations g
    where g.member_signature=v_signature
    limit 1;
    if v_group is not null then
      return query select v_group,false;
      return;
    end if;
    raise;
end;
$$;

revoke all on function public.create_group_from_direct(uuid,uuid,text) from public,anon;
grant execute on function public.create_group_from_direct(uuid,uuid,text) to authenticated;

create or replace function public.add_member_to_group(p_conversation_id uuid,p_invitee_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_me uuid:=auth.uid();
  v_signature text;
  v_existing uuid;
begin
  if v_me is null or not public.is_group_member(p_conversation_id,v_me) then
    raise exception 'No autorizado';
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

  select md5(string_agg(uid::text, ',' order by uid::text))
    into v_signature
  from (
    select gm.user_id as uid
    from public.group_conversation_members gm
    where gm.conversation_id=p_conversation_id
    union
    select p_invitee_id
  ) q;

  select g.id into v_existing
  from public.group_conversations g
  where g.member_signature=v_signature
    and g.id<>p_conversation_id
  limit 1;

  if v_existing is not null then
    raise exception 'Ya existe un grupo con exactamente estas personas';
  end if;

  insert into public.group_conversation_members(conversation_id,user_id,invited_by)
  values(p_conversation_id,p_invitee_id,v_me);

  update public.group_conversations
  set member_signature=v_signature
  where id=p_conversation_id;
end;
$$;

revoke all on function public.add_member_to_group(uuid,uuid) from public,anon;
grant execute on function public.add_member_to_group(uuid,uuid) to authenticated;

create or replace function public.rename_group(p_conversation_id uuid,p_title text)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_me uuid:=auth.uid();
begin
  if v_me is null then raise exception 'No autenticado'; end if;
  if not exists(
    select 1 from public.group_conversations g
    where g.id=p_conversation_id and g.created_by=v_me
  ) then
    raise exception 'Solo quien creó el grupo puede cambiar el nombre';
  end if;

  update public.group_conversations
  set title=left(trim(coalesce(p_title,'')),60)
  where id=p_conversation_id;
end;
$$;

revoke all on function public.rename_group(uuid,text) from public,anon;
grant execute on function public.rename_group(uuid,text) to authenticated;
