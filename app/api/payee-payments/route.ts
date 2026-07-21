import { type NextRequest, NextResponse } from "next/server"
import { rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { postPayeePaymentJournalEntry } from "@/lib/journal"

export const dynamic = "force-dynamic"

// Default TDS rates by section. User can override for edge cases
// (e.g. 194C is 2% for company payees vs 1% for individuals).
const DEFAULT_TDS_RATES: Record<string, number> = {
  "194J": 10,
  "194C": 1,
}

// GET /api/payee-payments — list, newest first. Optional ?quarter=Q1&fy=2025-26 for TDS summary.
export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))

    // Single-line rawSql — multi-line SELECTs with JOINs silently return empty via exec_sql RPC.
    const payments = await rawSql(
      `SELECT pp.*, p.name AS payee_name, p.payee_type, p.pan_no FROM payee_payments pp JOIN payees p ON p.id = pp.payee_id WHERE pp.org_id = ${oid} ORDER BY pp.payment_date DESC, pp.id DESC`,
    )
    return NextResponse.json(payments)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/payee-payments — record a payment, computes TDS, posts to the ledger.
export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))
    const body = await request.json()
    const { payee_id, amount, tds_section, tds_rate, payment_date, payment_method, reference_number, notes } = body
    // Payroll deductions (Epic 18 Phase B). PF/ESI have fixed statutory formulas the
    // client computes from an editable default; Professional Tax and TDS u/s 192 are
    // manual entry — 192 depends on the employee's declared regime/deductions, a real
    // tax-slab judgment call this app deliberately doesn't compute (same principle as
    // Advance Tax), so for section "192" tds_amount below is taken as given, not rate × gross.
    const pfAmount = Number(body.pf_amount) || 0
    const esiAmount = Number(body.esi_amount) || 0
    const professionalTaxAmount = Number(body.professional_tax_amount) || 0

    if (!payee_id) return NextResponse.json({ error: "payee_id is required" }, { status: 400 })
    if (!amount || Number(amount) <= 0) return NextResponse.json({ error: "amount must be greater than 0" }, { status: 400 })
    if (!payment_date) return NextResponse.json({ error: "payment_date is required" }, { status: 400 })

    const grossAmount = Number(amount)
    let tdsAmount: number
    let effectiveRate: number
    if (tds_section === "192") {
      // Manual entry — no rate-based computation for salary TDS.
      tdsAmount = Number(body.tds_amount) || 0
      effectiveRate = grossAmount > 0 ? Math.round((tdsAmount / grossAmount) * 10000) / 100 : 0
    } else {
      effectiveRate = tds_section ? Number(tds_rate ?? DEFAULT_TDS_RATES[tds_section] ?? 0) : 0
      tdsAmount = Math.round(((grossAmount * effectiveRate) / 100) * 100) / 100
    }
    const netAmount = grossAmount - tdsAmount - pfAmount - esiAmount - professionalTaxAmount

    const q = (v: unknown) => (v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`)
    const n = (v: unknown) => (v == null ? "NULL" : String(Number(v)))

    await rawSql(
      `INSERT INTO payee_payments (org_id, payee_id, amount, tds_section, tds_rate, tds_amount, pf_amount, esi_amount, professional_tax_amount, net_amount, payment_date, payment_method, reference_number, notes) VALUES (${oid}, ${Number(payee_id)}, ${n(grossAmount)}, ${q(tds_section || null)}, ${n(effectiveRate)}, ${n(tdsAmount)}, ${n(pfAmount)}, ${n(esiAmount)}, ${n(professionalTaxAmount)}, ${n(netAmount)}, ${q(payment_date)}, ${q(payment_method || null)}, ${q(reference_number || null)}, ${q(notes || null)})`,
    )
    const fetched = await rawSql(
      `SELECT pp.*, p.name AS payee_name FROM payee_payments pp JOIN payees p ON p.id = pp.payee_id WHERE pp.org_id = ${oid} ORDER BY pp.id DESC LIMIT 1`,
    )
    const payment = fetched[0] ?? {}

    // Epic 12 ledger: post best-effort, don't block payment save if it fails.
    if (payment.id) {
      try {
        await postPayeePaymentJournalEntry(orgId, {
          id: Number(payment.id),
          payee_name: String(payment.payee_name),
          payment_date: String(payment.payment_date),
          amount: Number(payment.amount),
          tds_amount: Number(payment.tds_amount) || 0,
          pf_amount: Number(payment.pf_amount) || 0,
          esi_amount: Number(payment.esi_amount) || 0,
          professional_tax_amount: Number(payment.professional_tax_amount) || 0,
          payment_method: payment.payment_method as string | null,
          reference_number: payment.reference_number as string | null,
        })
      } catch (journalError: any) {
        console.error("Journal posting failed for payee payment", payment.id, journalError.message)
      }
    }

    return NextResponse.json(payment)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT — link (or unlink) a payee payment to the bank transaction it corresponds
// to, so it isn't double-counted as both raw bank activity and a payee record.
export async function PUT(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))
    const { id, linked_bank_transaction_id } = await request.json()
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

    const linkVal = linked_bank_transaction_id ? String(Number(linked_bank_transaction_id)) : "NULL"
    await rawSql(`UPDATE payee_payments SET linked_bank_transaction_id = ${linkVal} WHERE id = ${Number(id)} AND org_id = ${oid}`)
    const fetched = await rawSql(
      `SELECT pp.*, p.name AS payee_name FROM payee_payments pp JOIN payees p ON p.id = pp.payee_id WHERE pp.id = ${Number(id)} AND pp.org_id = ${oid}`,
    )
    if (!fetched[0]) return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    return NextResponse.json(fetched[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
