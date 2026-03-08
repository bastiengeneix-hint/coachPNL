import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and auth API routes
  if (
    publicPaths.some((path) => pathname.startsWith(path)) ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect to login if no token
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Block /api/rag/upload for non-admin users
  if (pathname.startsWith('/api/rag/upload') && token.role !== 'admin') {
    return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
  }

  // If onboarding is not complete, redirect to /onboarding
  // (except if already on /onboarding or hitting an API route)
  if (
    !token.onboardingComplete &&
    !pathname.startsWith('/onboarding') &&
    !pathname.startsWith('/api')
  ) {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - manifest.json
     * - public folder assets (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
