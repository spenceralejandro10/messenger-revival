-- Expand Messenger presence states beyond the base online/busy/away/offline values.
alter table public.profiles
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('online','busy','away','brb','phone','lunch','invisible','offline'));
