-- Friendships are reciprocal. Remove legacy one-sided rows, expose only
-- mutual contacts, and make any contact deletion remove the reciprocal row.
delete from public.contacts c
where not exists (
  select 1 from public.contacts r
  where r.owner_id=c.contact_id and r.contact_id=c.owner_id
);

create or replace function public.get_mutual_contact_ids()
returns table(contact_id uuid)
language sql
stable
security definer
set search_path=public
as $$
  select c.contact_id
  from public.contacts c
  where c.owner_id=auth.uid()
    and exists (
      select 1 from public.contacts r
      where r.owner_id=c.contact_id
        and r.contact_id=c.owner_id
    )
  order by c.created_at;
$$;

revoke all on function public.get_mutual_contact_ids() from public,anon;
grant execute on function public.get_mutual_contact_ids() to authenticated;

create or replace function public.sync_reciprocal_contact_delete()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if pg_trigger_depth() < 2 then
    delete from public.contacts
    where owner_id=old.contact_id and contact_id=old.owner_id;
  end if;

  delete from public.friend_requests
  where (sender_id=old.owner_id and receiver_id=old.contact_id)
     or (sender_id=old.contact_id and receiver_id=old.owner_id);

  return old;
end;
$$;

drop trigger if exists contacts_delete_reciprocal on public.contacts;
create trigger contacts_delete_reciprocal
after delete on public.contacts
for each row execute function public.sync_reciprocal_contact_delete();

create or replace function public.can_send_message(p_sender uuid, p_recipient uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select p_sender=auth.uid()
    and (
      p_sender=p_recipient
      or (
        exists(select 1 from public.contacts c where c.owner_id=p_sender and c.contact_id=p_recipient)
        and exists(select 1 from public.contacts c where c.owner_id=p_recipient and c.contact_id=p_sender)
      )
    )
    and not exists(
      select 1 from public.blocks b
      where (b.owner_id=p_sender and b.blocked_id=p_recipient)
         or (b.owner_id=p_recipient and b.blocked_id=p_sender)
    );
$$;
