import { NextResponse } from "next/server"
import { getCurrentOrgId } from "@/lib/get-org"
import { suggestPayeePaymentLinks } from "@/lib/reconcile-engine"

export const dynamic = "force-dynamic"

// GET /api/payee-payments/suggestions — best-guess bank transaction match per
// unlinked payee payment. Suggest-only, never writes; the client confirms.
export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const suggestions = await suggestPayeePaymentLinks(orgId)
    return NextResponse.json(suggestions)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
