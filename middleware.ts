import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Allow all requests through for now
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/login", "/auth/sign-up"],
}
