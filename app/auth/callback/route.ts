// Server-side OAuth callback handler (recommended by Supabase for Next.js App Router).
// Supabase stores the PKCE code verifier in a cookie, so the exchange works
// server-side — no client JS needed.
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get("code")
  const next  = searchParams.get("next") ?? "/dashboard"
  const error = searchParams.get("error")

  if (error) {
    const desc = searchParams.get("error_description") ?? "OAuth sign-in was cancelled"
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(desc)}`)
  }

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error("OAuth code exchange error:", exchangeError.message)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
