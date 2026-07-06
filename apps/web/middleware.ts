import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Protects the admin dashboard: requires a session AND profiles.role = 'admin'.
// Also refreshes the auth cookie on every request (Supabase SSR pattern).
export async function middleware(request: NextRequest) {
  // Fully public static pages — no auth context needed.
  const STATIC_PUBLIC = ['/', '/privacy', '/terms'];
  if (STATIC_PUBLIC.includes(request.nextUrl.pathname)) return NextResponse.next();

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
  const path = request.nextUrl.pathname;

  const isLogin = path === '/login' || path.startsWith('/auth');
  // Public: landing page (/) and login/auth. Everything else is the admin console.
  const isPublic = path === '/' || isLogin;
  const isProtected = !isPublic;

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && isProtected) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      // Signed in but not an admin — bounce to login with an error flag.
      return NextResponse.redirect(new URL('/login?error=not_admin', request.url));
    }
  }

  if (user && isLogin) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
