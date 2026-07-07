import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Protects the admin dashboard: requires a session AND profiles.role = 'admin'.
// Also refreshes the auth cookie on every request (Supabase SSR pattern).
export async function middleware(request: NextRequest) {
  // Fully public static pages — no auth context needed.
  const STATIC_PUBLIC = ['/', '/privacy', '/terms', '/promos'];
  if (STATIC_PUBLIC.includes(request.nextUrl.pathname)) return NextResponse.next();

  // Customer shop routes: browsing is public; login is enforced client-side at
  // checkout. These are NOT admin-gated (unlike /dashboard etc.).
  const CUSTOMER_PREFIXES = ['/food', '/rentals', '/stays', '/orders', '/bookings', '/account'];
  const path = request.nextUrl.pathname;
  if (CUSTOMER_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list: CookieToSet[]) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  // /login and /auth/* are the only non-static public routes; everything else is admin.
  const isLogin = path === '/login' || path.startsWith('/auth');

  // Not signed in → only the login/auth pages are reachable.
  if (!user) {
    if (!isLogin) return NextResponse.redirect(new URL('/login', request.url));
    return response;
  }

  // Signed in → is this user an admin?
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) {
    // Non-admin (e.g. a customer who signed in with Google): show the login page
    // with the error — do NOT redirect it back to /dashboard (that caused a loop).
    if (isLogin) return response;
    return NextResponse.redirect(new URL('/login?error=not_admin', request.url));
  }

  // Admin → keep them out of the login page.
  if (isLogin) return NextResponse.redirect(new URL('/dashboard', request.url));
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
