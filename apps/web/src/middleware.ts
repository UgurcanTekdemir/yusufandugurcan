import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Public routes that don't require authentication
 */
const publicRoutes = ["/login", "/signup", "/", "/live"];

/**
 * Check if a path is a public route
 */
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get("session");

  // If no session cookie, redirect to login
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session cookie exists, allow request to proceed
  // The server components can verify the session cookie using serverAuth
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
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
