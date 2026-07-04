-- =============================================================
-- AngkorGo — 0001 Extensions & Enums
-- Phase 1: Database Design
-- =============================================================

-- Geospatial (nearest-provider search, ST_DWithin radius dispatch)
create extension if not exists postgis;
-- gen_random_uuid(), crypto helpers
create extension if not exists pgcrypto;

-- ---------- Enum types ----------

-- Role of a platform account. auth.users is the identity table;
-- public.profiles.role drives RBAC across RLS policies.
create type user_role as enum ('customer', 'provider', 'admin');

create type provider_status as enum ('pending', 'approved', 'suspended', 'rejected');

-- Lifecycle of a rescue request (see docs/ARCHITECTURE.md state machine)
create type request_status as enum (
  'pending',      -- created, not yet dispatched
  'dispatching',  -- offers being sent, expanding radius
  'accepted',     -- a provider accepted
  'en_route',     -- provider driving to customer
  'arrived',      -- provider on scene
  'in_progress',  -- work happening
  'completed',    -- customer approved + paid
  'cancelled',    -- cancelled by customer/admin
  'expired'       -- no provider accepted in time
);

-- One offer to a single provider inside a request's dispatch fan-out
create type assignment_status as enum ('offered', 'accepted', 'rejected', 'expired', 'cancelled');

create type payment_status as enum ('pending', 'held', 'released', 'refunded', 'failed');

create type payment_method as enum ('aba_payway', 'khqr', 'stripe', 'wing', 'acleda', 'cash');

create type document_type as enum (
  'national_id', 'drivers_license', 'business_license', 'vehicle_photo', 'profile_photo'
);

create type withdrawal_status as enum ('pending', 'processing', 'paid', 'rejected');

create type service_category as enum (
  'flat_tire',
  'battery_jump_start',
  'battery_replacement',
  'fuel_delivery',
  'lockout_service',
  'tow_truck',
  'engine_diagnosis',
  'emergency_repair',
  'motorcycle_repair',
  'car_repair',
  'van_repair',
  'truck_repair'
);

create type image_kind as enum ('vehicle', 'problem', 'before', 'after', 'invoice');
