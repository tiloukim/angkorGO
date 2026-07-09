-- =============================================================
-- AngkorGo Safety — DEMO police stations (TEST/DEV ONLY)
-- Paste into the SQL Editor and Run once (after migration 0034).
--
-- ⚠️ These are APPROXIMATE Phnom Penh coordinates for testing the nearest-station
-- matching only. Replace with REAL, verified station names / phones / GPS and
-- signed partner agreements before this feature is used for real emergencies.
-- =============================================================

insert into public.police_stations (name, phone, address, location, lat, lng, monthly_fee, active)
select s.name, s.phone, s.addr, st_point(s.lng, s.lat)::geography, s.lat, s.lng, 50.00, true
from (values
  ('Daun Penh District Police',   '023-000001', 'Daun Penh, Phnom Penh',   11.5697, 104.9270),
  ('Chamkarmon District Police',  '023-000002', 'Chamkarmon, Phnom Penh',  11.5449, 104.9220),
  ('7 Makara District Police',    '023-000003', '7 Makara, Phnom Penh',    11.5680, 104.9130),
  ('Toul Kork District Police',   '023-000004', 'Toul Kork, Phnom Penh',   11.5750, 104.8890),
  ('Sen Sok District Police',     '023-000005', 'Sen Sok, Phnom Penh',     11.5900, 104.8900)
) as s(name, phone, addr, lat, lng)
where not exists (select 1 from public.police_stations p where p.name = s.name);

-- =============================================================
-- TEARDOWN:  delete from public.police_stations where phone like '023-00000%';
-- =============================================================
