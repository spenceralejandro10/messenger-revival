-- Prevent old call invitations from reappearing after refreshes. An unanswered
-- invite is only valid for 45 seconds; the rest of the call signaling keeps its own lifetime.
create or replace function public.limit_video_invite_lifetime()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.signal_type='invite' then
    new.expires_at := least(new.expires_at, now() + interval '45 seconds');
  end if;
  return new;
end;
$$;

drop trigger if exists video_invite_short_expiry on public.video_call_signals;
create trigger video_invite_short_expiry
before insert on public.video_call_signals
for each row execute function public.limit_video_invite_lifetime();

update public.video_call_signals
set expires_at = least(expires_at, created_at + interval '45 seconds')
where signal_type='invite';

delete from public.video_call_signals
where signal_type='invite'
  and expires_at <= now();
