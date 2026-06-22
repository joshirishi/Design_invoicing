// Supabase Auth helpers — server-side and client-side
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Browser client — uses anon key + persists session in localStorage
export function createBrowserClient() {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
}

// Server admin client — bypasses RLS
export function createServerClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  })
}
