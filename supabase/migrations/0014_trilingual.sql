-- =============================================================
-- AngkorGo — 0014 Trilingual (English / Khmer / Chinese)
-- The platform now supports 'zh' in addition to 'en' and 'km'.
-- =============================================================

alter table public.profiles drop constraint if exists profiles_preferred_language_check;
alter table public.profiles
  add constraint profiles_preferred_language_check
  check (preferred_language in ('en', 'km', 'zh'));
