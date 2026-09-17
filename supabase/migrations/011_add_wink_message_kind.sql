-- Persist Messenger-style Winks as their own message kind so sender and
-- recipient can play the same animation in real time.
alter table public.messages
  drop constraint if exists messages_kind_check;

alter table public.messages
  add constraint messages_kind_check
  check (kind = any (array['text','image','audio','file','emoji','nudge','wink']));

alter table public.group_messages
  drop constraint if exists group_messages_kind_check;

alter table public.group_messages
  add constraint group_messages_kind_check
  check (kind = any (array['text','emoji','nudge','wink']));
