/**
 * Client-safe helper for calling API routes from React components.
 * Does NOT import postgres or any server-only code.
 */
export async function fetchFromAPI(endpoint: string, options?: RequestInit) {
  const res = await fetch(endpoint, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(error || `API error: ${res.status}`)
  }
  return res.json()
}
