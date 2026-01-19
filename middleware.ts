import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define role-based route access
const ROLE_ACCESS = {
  admin: ['/admin', '/users', '/settings'],
  supervisor: ['/supervisor', '/reports'],
  user: ['/dashboard', '/profile']
};

// Simple function to check if token exists (without verification)
function hasValidToken(token: string | undefined): boolean {
  return token !== undefined && token.length > 0;
}

export function middleware(request: NextRequest) {
  // Allow all API routes to pass through
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check for protected routes
  const token = request.cookies.get('token')?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith('/signin') || 
                    request.nextUrl.pathname.startsWith('/signup') ||
                    request.nextUrl.pathname.startsWith('/forgot-password') ||
                    request.nextUrl.pathname.startsWith('/reset-password');
  const isGoogleCallback = request.nextUrl.pathname.startsWith('/api/auth/google/callback');

  // Allow Google callback to proceed
  if (isGoogleCallback) {
    return NextResponse.next();
  }

  // Redirect to signin if no token and not on auth page
  if (!hasValidToken(token) && !isAuthPage) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  // Redirect to home if already authenticated and trying to access auth pages
  if (hasValidToken(token) && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Note: Role-based access control is handled in the API routes and components
  // to avoid JWT verification in Edge Runtime

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}; 