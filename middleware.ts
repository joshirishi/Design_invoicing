import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const PUBLIC_PATHS = ["/login", "/auth", "/onboarding", "/accept-invite", "/reset-password", "/api/"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths through without auth check
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next()
  }

  // Auth not configured — allow through (dev mode)
  if (!SUPABASE_URL || !ANON_KEY) return NextResponse.next()

  let response = NextResponse.next({ request })

  // createServerClient from @supabase/ssr reads/writes session cookies
  const supabase = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // Forward any refreshed session cookies to the browser
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
