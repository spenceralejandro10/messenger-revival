-- Persist MSN-style display name formatting for every real account.
alter table public.profiles
  add column if not exists display_name_font text not null default 'Tahoma',
  add column if not exists display_name_style text not null default 'normal',
  add column if not exists display_name_size integer not null default 11,
  add column if not exists display_name_color text not null default '#111111';

alter table public.profiles
  drop constraint if exists profiles_display_name_style_check,
  add constraint profiles_display_name_style_check
    check (display_name_style in ('normal','bold','italic','bold-italic'));

alter table public.profiles
  drop constraint if exists profiles_display_name_size_check,
  add constraint profiles_display_name_size_check
    check (display_name_size between 9 and 18);

alter table public.profiles
  drop constraint if exists profiles_display_name_color_check,
  add constraint profiles_display_name_color_check
    check (display_name_color ~ '^#[0-9A-Fa-f]{6}$');
