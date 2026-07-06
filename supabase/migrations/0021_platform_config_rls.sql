-- =============================================================
-- AngkorGo — 0021 Secure platform_config + global surge
-- Public can read config (fares/surge); only admins can change it.
-- =============================================================

alter table public.platform_config enable row level security;

create policy "config: public read" on public.platform_config
  for select using (true);
create policy "config: admin write" on public.platform_config
  for all using (public.is_admin()) with check (public.is_admin());

-- Global ride surge multiplier (Phnom Penh single-zone launch).
insert into public.platform_config (key, value) values ('surge_multiplier', '1.0')
  on conflict (key) do nothing;
