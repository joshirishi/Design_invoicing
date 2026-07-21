import { NextResponse } from "next/server"
import { rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export const dynamic = "force-dynamic"

const TOLERANCE = 1 // rupees — floating point / rounding noise, not a real mismatch

// GET /api/gstr2b/reconciliation?period=MMYYYY
// Reconciles the GST portal's own ITC statement against what's actually been
// logged as Purchases, at the supplier-GSTIN level (not per-invoice — real
// invoice-number formatting varies too much between the portal and manual
// entry to match reliably at that granularity for a first pass).
export async function GET(request: Request) {
  try {
    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period")
    if (!period || !/^\d{6}$/.test(period)) {
      return NextResponse.json({ error: "period is required in MMYYYY format" }, { status: 400 })
    }
    const mm = period.slice(0, 2)
    const yyyy = period.slice(2)
    const monthStart = `${yyyy}-${mm}-01`

    const gstr2b = await rawSql(
      `SELECT supplier_gstin, MAX(supplier_name) AS supplier_name, SUM(taxable_value) AS taxable_value, SUM(cgst) AS cgst, SUM(sgst) AS sgst, SUM(igst) AS igst FROM gstr2b_entries WHERE org_id = ${oid} AND period = '${period}' AND itc_available = true GROUP BY supplier_gstin`,
    )
    const purchases = await rawSql(
      `SELECT vendor_gstin, MAX(vendor_name) AS vendor_name, SUM(amount) AS taxable_value, SUM(cgst) AS cgst, SUM(sgst) AS sgst, SUM(igst) AS igst FROM purchases WHERE org_id = ${oid} AND vendor_gstin IS NOT NULL AND invoice_date >= '${monthStart}' AND invoice_date < ('${monthStart}'::date + INTERVAL '1 month') GROUP BY vendor_gstin`,
    )
    // Purchases with no GSTIN on file can't be matched to a GSTR-2B supplier at all —
    // surfaced explicitly so an empty reconciliation isn't mistaken for "nothing to claim".
    const missingGstinRows = await rawSql(
      `SELECT COUNT(*)::int AS count FROM purchases WHERE org_id = ${oid} AND vendor_gstin IS NULL AND invoice_date >= '${monthStart}' AND invoice_date < ('${monthStart}'::date + INTERVAL '1 month')`,
    )
    const purchasesMissingGstin = Number(missingGstinRows[0]?.count || 0)

    const byGstin = new Map<
      string,
      { name: string | null; gstr2b: { taxable: number; tax: number } | null; purchases: { taxable: number; tax: number } | null }
    >()

    for (const r of gstr2b) {
      const gstin = String(r.supplier_gstin)
      byGstin.set(gstin, {
        name: r.supplier_name as string | null,
        gstr2b: { taxable: Number(r.taxable_value), tax: Number(r.cgst) + Number(r.sgst) + Number(r.igst) },
        purchases: null,
      })
    }
    for (const r of purchases) {
      const gstin = String(r.vendor_gstin)
      const existing = byGstin.get(gstin) ?? { name: r.vendor_name as string | null, gstr2b: null, purchases: null }
      existing.purchases = { taxable: Number(r.taxable_value), tax: Number(r.cgst) + Number(r.sgst) + Number(r.igst) }
      if (!existing.name) existing.name = r.vendor_name as string | null
      byGstin.set(gstin, existing)
    }

    const matched: any[] = []
    const availableNotClaimed: any[] = []
    const claimedNotInGstr2b: any[] = []

    for (const [gstin, row] of byGstin.entries()) {
      const g2bTax = row.gstr2b?.tax ?? 0
      const pTax = row.purchases?.tax ?? 0
      const entry = { supplier_gstin: gstin, supplier_name: row.name, gstr2b_tax: g2bTax, purchases_tax: pTax, diff: pTax - g2bTax }

      if (row.gstr2b && row.purchases && Math.abs(g2bTax - pTax) <= TOLERANCE) {
        matched.push(entry)
      } else if (row.gstr2b && (!row.purchases || g2bTax - pTax > TOLERANCE)) {
        availableNotClaimed.push(entry)
      } else if (row.purchases && (!row.gstr2b || pTax - g2bTax > TOLERANCE)) {
        claimedNotInGstr2b.push(entry)
      }
    }

    return NextResponse.json({
      period,
      matched,
      availableNotClaimed,
      claimedNotInGstr2b,
      purchasesMissingGstin,
      totalGstr2bTax: gstr2b.reduce((s, r) => s + Number(r.cgst) + Number(r.sgst) + Number(r.igst), 0),
      totalPurchasesTax: purchases.reduce((s, r) => s + Number(r.cgst) + Number(r.sgst) + Number(r.igst), 0),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
