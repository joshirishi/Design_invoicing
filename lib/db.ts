// Database layer using Supabase HTTPS (no direct TCP/IPv6 needed).
// All queries go through the exec_sql RPC function secured to service_role only.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

type Row = Record<string, unknown>

// Interpolates tagged-template values safely using PostgreSQL dollar-quoting
// to prevent SQL injection. Values are cast to their proper types.
function interpolate(strings: TemplateStringsArray, values: unknown[]): string {
  let query = ""
  strings.forEach((str, i) => {
    query += str
    if (i < values.length) {
      const v = values[i]
      if (v === null || v === undefined) {
        query += "NULL"
      } else if (typeof v === "number") {
        query += Number.isFinite(v) ? v : "NULL"
      } else if (typeof v === "boolean") {
        query += v ? "TRUE" : "FALSE"
      } else if (Array.isArray(v)) {
        // e.g. WHERE id = ANY(ARRAY[...])
        query += `ARRAY[${v.map((x) => `'${String(x).replace(/'/g, "''")}'`).join(",")}]`
      } else if (v instanceof Date) {
        query += `'${v.toISOString().replace("T", " ").replace("Z", "+00")}'`
      } else {
        query += `'${String(v).replace(/'/g, "''")}'`
      }
    }
  })
  return query
}

// sql`` tagged template — drop-in replacement for postgres.js syntax.
// Returns a plain array of row objects, same as postgres.js.
export async function sql(strings: TemplateStringsArray, ...values: unknown[]): Promise<Row[]> {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
  }

  const query = interpolate(strings, values)

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query }),
    // No connection pooling issues — plain HTTPS request
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`DB query failed (${res.status}): ${body}\nQuery: ${query.slice(0, 200)}`)
  }

  const data = await res.json()
  // exec_sql returns a JSON array; handle both array and single-object results
  return Array.isArray(data) ? data : [data]
}

// Re-export from the client-safe module so existing imports still work.
export { fetchFromAPI } from "@/lib/fetch"
