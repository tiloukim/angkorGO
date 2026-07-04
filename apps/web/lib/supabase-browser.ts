import { createBrowserClient } from '@supabase/ssr';

// Client-side Supabase for the admin login form (email OTP + Google).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
