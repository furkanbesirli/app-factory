import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Paths that should not be protected
    const publicPaths = ['/login', '/favicon.ico', '/_next', '/api', '/apps.json'];

    // Check if current path is public
    const isPublic = publicPaths.some(path => pathname.startsWith(path));

    // Policy pages are handled by Envoy but double check here if they ever hit web_service
    const isPolicyFile = pathname.match(/^\/[a-zA-Z0-9._-]+\/(privacy-policy|child-safety)\.html$/);

    if (isPublic || isPolicyFile) {
        return NextResponse.next();
    }

    // Check for session cookie
    const session = request.cookies.get('admin_session');

    if (!session || session.value !== 'valid') {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - apps.json (public config)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|apps.json).*)',
    ],
};
