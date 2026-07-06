-- =============================================================
-- AngkorGo — 0012 Data API grants
-- Makes table access explicit for the anon/authenticated roles instead of
-- relying on Supabase's "expose new tables" default. RLS policies (0005/0009/…)
-- still enforce row-level access; these grants only satisfy Postgres' table-level
-- privilege check (needed e.g. when an RLS policy subqueries another table).
-- Idempotent — safe to run on an already-working project.
-- =============================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Future tables get the same grants automatically.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;

-- NOTE: function EXECUTE grants are intentionally NOT blanket-granted here so the
-- webhook-only RPCs revoked in 0011 (confirm_payment, release_payment_admin) stay
-- restricted to service_role.
