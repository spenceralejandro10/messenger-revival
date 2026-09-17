-- Do not allow a new video-call invitation to be created for a user who
-- is actually disconnected. Busy/away/etc. remain callable.
create or replace function public.enforce_online_video_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_status text;
  recipient_seen timestamptz;
begin
  if new.signal_type <> 'invite' then
    return new;
  end if;

  select p.status, p.last_seen_at
    into recipient_status, recipient_seen
  from public.profiles p
  where p.id = new.recipient_id;

  if recipient_status is null
     or recipient_status = 'offline'
     or recipient_seen is null
     or recipient_seen < now() - interval '15 seconds' then
    raise exception 'RECIPIENT_OFFLINE';
  end if;

  return new;
end;
$$;

drop trigger if exists video_invite_requires_online_recipient on public.video_call_signals;
create trigger video_invite_requires_online_recipient
before insert on public.video_call_signals
for each row execute function public.enforce_online_video_invite();
