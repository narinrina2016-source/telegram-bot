import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const urlParams = new URLSearchParams(request.nextUrl.search);
  const orgSlugParam = urlParams.get('org');
  
  let response = NextResponse.next();
  
  if (orgSlugParam) {
    response.cookies.set('orgSlug', orgSlugParam, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
