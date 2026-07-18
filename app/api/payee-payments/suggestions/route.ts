import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { suggestPayeePaymentLinks, resolveCounterpartyName } from "@/lib/reconcile-engine"

export const dynamic = "force-dynamic"

// GET /api/payee-payments/suggestions — best-guess bank transaction match per
// unlinked payee payment. Suggest-only, never writes; the client confirms.
export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const [suggestions, upiContacts] = await Promise.all([
      suggestPayeePaymentLinks(orgId),
      sql`SELECT utr, vpa, display_name FROM upi_contacts WHERE org_id = ${orgId}`.catch(() => []),
    ])

    const resolved = suggestions.map((s) => ({
      ...s,
      transaction: {
        ...s.transaction,
        resolved_name: upiContacts.length > 0 ? resolveCounterpartyName(s.transaction.description, upiContacts as any) : null,
      },
    }))

    return NextResponse.json(resolved)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
