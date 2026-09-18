-- Removing a friend removes the reciprocal contact relationship as well,
-- while leaving existing conversation history and group memberships intact.
create or replace function public.remove_friend(p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_me uuid:=auth.uid();
begin
  if v_me is null then raise exception 'No autenticado'; end if;
  if p_contact_id is null or p_contact_id=v_me then raise exception 'Contacto inválido'; end if;

  delete from public.contacts
  where (owner_id=v_me and contact_id=p_contact_id)
     or (owner_id=p_contact_id and contact_id=v_me);

  delete from public.friend_requests
  where (sender_id=v_me and receiver_id=p_contact_id)
     or (sender_id=p_contact_id and receiver_id=v_me);
end;
$$;

revoke all on function public.remove_friend(uuid) from public,anon;
grant execute on function public.remove_friend(uuid) to authenticated;
