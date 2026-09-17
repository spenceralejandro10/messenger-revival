-- Reliable online/offline presence. A user is considered disconnected when
-- their heartbeat becomes stale or they explicitly sign out.
alter table public.profiles
  add column if not exists last_seen_at timestamptz;

create or replace function public.heartbeat_presence()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  touched_at timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set last_seen_at = touched_at,
      updated_at = now()
  where id = auth.uid();

  return touched_at;
end;
$$;

create or replace function public.mark_presence_offline()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set status = 'offline',
      last_seen_at = null,
      updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.heartbeat_presence() from public, anon;
revoke all on function public.mark_presence_offline() from public, anon;
grant execute on function public.heartbeat_presence() to authenticated;
grant execute on function public.mark_presence_offline() to authenticated;
