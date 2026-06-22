import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Routes that don't need auth
const PUBLIC_PATHS = ["/login", "/auth", "/onboarding", "/accept-invite", "/api/"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Only protect /dashboard routes
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next()
  }

  // Check for Supabase session cookie
  if (!SUPABASE_URL || !ANON_KEY) {
    // Auth not configured — allow through (dev mode)
    return NextResponse.next()
  }

  // Read the Supabase session from cookies
  const token = request.cookies.get("sb-access-token")?.value
    || request.cookies.get(`sb-${SUPABASE_URL.split("//")[1].split(".")[0]}-auth-token`)?.value

  if (!token) {
    // Try reading from the newer Supabase cookie format (JSON chunked)
    const cookieKey = Array.from(request.cookies.getAll())
      .find(c => c.name.includes("auth-token") && c.name.includes("supabase"))
    if (!cookieKey) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
