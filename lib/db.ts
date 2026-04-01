import { neon } from "@neondatabase/serverless"

// Create a Neon SQL client using the DATABASE_URL environment variable
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!connectionString) {
  console.warn("No database connection string found. Database operations will fail.")
}

export const sql = connectionString ? neon(connectionString) : (() => {
  throw new Error("No database connection string found. Please check your Neon integration.")
}) as any

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
