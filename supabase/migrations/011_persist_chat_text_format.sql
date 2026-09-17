-- Persist each user's chat composer font/style preferences.
alter table public.profiles
  add column if not exists chat_font_family text not null default 'Tahoma',
  add column if not exists chat_font_size integer not null default 11,
  add column if not exists chat_font_color text not null default '#000000',
  add column if not exists chat_font_bold boolean not null default false,
  add column if not exists chat_font_italic boolean not null default false,
  add column if not exists chat_font_underline boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_chat_font_family_check,
  add constraint profiles_chat_font_family_check
    check (char_length(chat_font_family) between 1 and 80),
  drop constraint if exists profiles_chat_font_size_check,
  add constraint profiles_chat_font_size_check
    check (chat_font_size between 8 and 48),
  drop constraint if exists profiles_chat_font_color_check,
  add constraint profiles_chat_font_color_check
    check (chat_font_color ~ '^#[0-9A-Fa-f]{6}$');
