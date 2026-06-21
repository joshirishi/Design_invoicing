/**
 * Resolves the current organization ID for API routes.
 *
 * In single-user mode (no Stack Auth), we return the first org in the DB.
 * Once multi-tenant auth is wired up, this reads the user's org from the session.
 */
import { sql } from "@/lib/db"

export async function getCurrentOrgId(): Promise<number> {
  // TODO (Phase 3 auth): resolve org_id from Stack Auth session
  // For now, fall back to the first org (single-user/default org)
  const rows = await sql`SELECT id FROM organizations ORDER BY id LIMIT 1`
  if (rows.length === 0) {
    throw new Error("No organization found. Please run /api/init-db first.")
  }
  return rows[0].id as number
}
