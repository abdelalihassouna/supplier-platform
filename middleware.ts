import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = [
    "/auth/login",
    "/auth/sign-up",
    "/api/health",
  ]

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Allow access to public routes
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Check for user session
  const userSession = request.cookies.get("user_id")

  // If no session and trying to access protected route, redirect to login
  if (!userSession && pathname !== "/auth/login") {
    const loginUrl = new URL("/auth/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  // If user has session and trying to access auth pages, redirect to dashboard
  if (userSession && (pathname === "/auth/login" || pathname === "/auth/sign-up")) {
    const dashboardUrl = new URL("/", request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
}
