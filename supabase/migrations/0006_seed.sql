-- =============================================================
-- AngkorGo Rescue — 0006 Seed (dev only)
-- Reference data + Phnom Penh sample geometry for local testing.
-- Run AFTER creating auth users; replace the UUIDs below with real auth ids.
-- =============================================================

-- Platform config: default commission (mirrors payments.provider_rate default)
create table if not exists public.platform_config (
  key   text primary key,
  value jsonb not null
);
insert into public.platform_config (key, value) values
  ('commission_rate', '0.10'),
  ('dispatch_radii_km', '[5,10,20]'),
  ('offer_ttl_seconds', '45')
on conflict (key) do nothing;

-- Service category catalogue with EN/KM labels for the emergency screen.
create table if not exists public.service_catalog (
  category  service_category primary key,
  label_en  text not null,
  label_km  text not null,
  icon      text
);
insert into public.service_catalog (category, label_en, label_km, icon) values
  ('flat_tire',          'Flat Tire',          'កង់​បែក',            'tire'),
  ('battery_jump_start', 'Battery Jump Start', 'ជម្រុញ​ថ្ម',          'battery-charging'),
  ('battery_replacement','Battery Replacement','ប្តូរ​ថ្ម',           'battery'),
  ('fuel_delivery',      'Out of Fuel',        'អស់​ប្រេង',          'fuel'),
  ('lockout_service',    'Lockout',            'ចាក់​សោ​ជាប់',        'lock'),
  ('tow_truck',          'Tow Truck',          'រថ​អូស',             'truck'),
  ('engine_diagnosis',   'Engine Trouble',     'បញ្ហា​ម៉ាស៊ីន',       'engine'),
  ('emergency_repair',   'Emergency Repair',   'ជួសជុល​បន្ទាន់',      'wrench'),
  ('motorcycle_repair',  'Motorcycle Repair',  'ជួសជុល​ម៉ូតូ',        'motorcycle'),
  ('car_repair',         'Car Repair',         'ជួសជុល​ឡាន',         'car'),
  ('van_repair',         'Van Repair',         'ជួសជុល​រថយន្ត​ដឹក',   'van'),
  ('truck_repair',       'Truck Repair',       'ជួសជុល​ឡាន​ធំ',       'truck')
on conflict (category) do nothing;

-- NOTE: sample provider/customer rows require real auth.users ids.
-- Example (Phnom Penh, Independence Monument ≈ 104.9219, 11.5564):
--   update public.provider_locations
--     set location = st_point(104.9219, 11.5564)::geography
--     where provider_id = '<provider-uuid>';
