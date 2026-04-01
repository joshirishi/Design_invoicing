import { neon, NeonQueryFunction } from "@neondatabase/serverless"

// Lazy initialization to ensure environment variable is available
let _sql: NeonQueryFunction<false, false> | null = null

export function getSql() {
  if (!_sql) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
    if (!connectionString) {
      throw new Error("No database connection string found. Please check your Neon integration.")
    }
    _sql = neon(connectionString)
  }
  return _sql
}

// For backward compatibility - creates client on first use
export const sql = new Proxy({} as NeonQueryFunction<false, false>, {
  apply: (_, __, args) => getSql()(...args),
  get: (_, prop) => {
    const client = getSql()
    return (client as any)[prop]
  }
})

// Helper function for client-side database operations via API routes
export async function fetchFromAPI(endpoint: string, options?: RequestInit) {
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(error || `API error: ${res.status}`)
  }

  return res.json()
}
