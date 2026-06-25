// Supabase OAuth callback handler.
// After Google (or any provider) signs in, Supabase redirects here with a code.
// We exchange it for a session and send the user to the dashboard.
import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-auth"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get("code")
  const next  = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabase = createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Something went wrong — send back to login with an error message
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
