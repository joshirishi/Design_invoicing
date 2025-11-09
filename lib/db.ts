import { neon } from "@neondatabase/serverless"

// Create a Neon SQL client using the DATABASE_URL environment variable
export const sql = neon(process.env.DATABASE_URL!)

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
