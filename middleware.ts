import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Auth is handled by checkAuth() in app/dashboard/layout.tsx (server component).
// Stack Auth manages its own session cookies — we cannot inspect them in middleware
// because it runs on the Edge Runtime which lacks Node.js crypto support.
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
