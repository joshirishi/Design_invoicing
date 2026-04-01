import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ALLOWED_EMAIL = "joshi.rishikesh@gmail.com"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Allow login page without authentication
  if (pathname === "/auth/login") {
    return NextResponse.next()
  }

  // Allow home page without authentication
  if (pathname === "/") {
    return NextResponse.next()
  }

  // Protect dashboard and other routes
  if (pathname.startsWith("/dashboard")) {
    // Check if user has a valid session
    const userCookie = request.cookies.get("user")

    if (!userCookie) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }

    try {
      const user = JSON.parse(userCookie.value)

      // Verify the user's email matches the allowed email
      if (user.email !== ALLOWED_EMAIL) {
        return NextResponse.redirect(new URL("/auth/login", request.url))
      }
    } catch {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/login", "/"],
}
