// Server-only Supabase client — do NOT import this in client components.
// Uses next/headers to read/write session cookies in Server Components.
import { createServerClient as createSSRServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function createServerComponentClient() {
  const cookieStore = await cookies()
  return createSSRServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Called from a Server Component — cookies can only be set
          // in middleware or route handlers, so this is safe to ignore
        }
      },
    },
  })
}
