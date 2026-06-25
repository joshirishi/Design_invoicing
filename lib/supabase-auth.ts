// Browser-side Supabase client — safe to import in client components.
// Uses @supabase/ssr which stores the session in cookies (readable by middleware).
import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Browser client — stores session in cookies so middleware can read it
export function createBrowserClient() {
  return createSSRBrowserClient(SUPABASE_URL, ANON_KEY)
}

// Admin client — bypasses RLS, server-side data operations only
export function createServerClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  })
}
