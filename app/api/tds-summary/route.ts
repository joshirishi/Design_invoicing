import { NextResponse } from "next/server"
import { rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export const dynamic = "force-dynamic"

// Expected rates by section — same table used for outbound (payee) TDS, applied
// here to the inbound direction: what a client should have deducted from you.
const EXPECTED_TDS_RATES: Record<string, number> = { "194J": 10, "194C": 1 }
const RATE_TOLERANCE = 0.5 // percentage points — flag anything off by more than this

// GET /api/tds-summary — US-55 (report) + US-56 (rate-mismatch flagging).
export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))

    // Single-line rawSql — multi-line SELECTs with JOINs silently return empty via exec_sql RPC.
    const payments = await rawSql(
      `SELECT p.id, p.payment_date, p.amount, p.tds_amount, p.tds_section, COALESCE(c.name, ic.name) AS client_name FROM payments p LEFT JOIN clients c ON p.client_id = c.id LEFT JOIN invoices i ON p.invoice_id = i.id LEFT JOIN clients ic ON i.client_id = ic.id WHERE p.org_id = ${oid} AND p.tds_amount > 0 ORDER BY p.payment_date DESC`,
    )

    const flagged: Array<{ id: string; client_name: string; payment_date: string; section: string; actualRate: number; expectedRate: number }> = []
    const summaryMap = new Map<string, { client_name: string; section: string; gross: number; tds: number; count: number }>()

    for (const p of payments) {
      const amount = Number(p.amount)
      const tdsAmount = Number(p.tds_amount)
      const section = String(p.tds_section || "Unspecified")
      const clientName = String(p.client_name || "Unknown client")

      const actualRate = amount > 0 ? Math.round((tdsAmount / amount) * 10000) / 100 : 0
      const expectedRate = EXPECTED_TDS_RATES[section]
      if (expectedRate !== undefined && Math.abs(actualRate - expectedRate) > RATE_TOLERANCE) {
        flagged.push({ id: String(p.id), client_name: clientName, payment_date: String(p.payment_date), section, actualRate, expectedRate })
      }

      const key = `${clientName}__${section}`
      const existing = summaryMap.get(key) ?? { client_name: clientName, section, gross: 0, tds: 0, count: 0 }
      existing.gross += amount
      existing.tds += tdsAmount
      existing.count += 1
      summaryMap.set(key, existing)
    }

    const summary = Array.from(summaryMap.values()).sort((a, b) => b.tds - a.tds)
    const totalTds = summary.reduce((s, r) => s + r.tds, 0)
    const totalGross = summary.reduce((s, r) => s + r.gross, 0)

    return NextResponse.json({ summary, flagged, totalTds, totalGross, paymentCount: payments.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
