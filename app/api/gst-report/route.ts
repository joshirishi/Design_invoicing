import { sql, rawSql } from "@/lib/db"
import { NextResponse } from "next/server"
import { getCurrentOrgId } from "@/lib/get-org"

export async function GET(request: Request) {
  try {
    const orgId = await getCurrentOrgId()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate") || "2024-01-01"
    const endDate = searchParams.get("endDate") || "2025-12-31"

    // Get GST collected (Output GST) from invoices grouped by month
    // Note: total_gst_collected includes igst_amount — inter-state invoices carry IGST
    // instead of CGST/SGST, so omitting it silently under-counts liability.
    const outputGST = await sql`
      SELECT
        DATE_TRUNC('month', invoice_date) as month,
        SUM(cgst_amount + sgst_amount + igst_amount) as total_gst_collected,
        SUM(cgst_amount) as total_cgst,
        SUM(sgst_amount) as total_sgst,
        SUM(igst_amount) as total_igst,
        SUM(total_amount) as total_invoiced,
        COUNT(*) as invoice_count
      FROM invoices
      WHERE org_id = ${orgId}
        AND invoice_date >= ${startDate}::date
        AND invoice_date <= ${endDate}::date
        AND status != 'draft'
      GROUP BY DATE_TRUNC('month', invoice_date)
      ORDER BY month DESC
    `

    // Get reconciled payments with GST breakdown
    const reconciledPayments = await sql`
      SELECT
        DATE_TRUNC('month', p.payment_date) as month,
        SUM(p.amount) as total_received,
        SUM(i.cgst_amount + i.sgst_amount + i.igst_amount) as gst_on_received,
        COUNT(*) as payment_count
      FROM payments p
      INNER JOIN invoices i ON p.invoice_id = i.id
      WHERE p.org_id = ${orgId}
        AND p.reconciled = true
        AND p.payment_date >= ${startDate}::date
        AND p.payment_date <= ${endDate}::date
      GROUP BY DATE_TRUNC('month', p.payment_date)
      ORDER BY month DESC
    `

    // Per-client/per-state breakdown for GSTR-1 (place of supply + inter/intra-state split)
    const b2bBreakdown = await sql`
      SELECT
        DATE_TRUNC('month', i.invoice_date) as month,
        c.name as client_name,
        c.gstin as client_gstin,
        i.place_of_supply,
        SUM(i.amount_before_tax) as taxable_value,
        SUM(i.cgst_amount) as cgst_amount,
        SUM(i.sgst_amount) as sgst_amount,
        SUM(i.igst_amount) as igst_amount
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.org_id = ${orgId}
        AND i.invoice_date >= ${startDate}::date
        AND i.invoice_date <= ${endDate}::date
        AND i.status != 'draft'
        AND c.gstin IS NOT NULL
      GROUP BY DATE_TRUNC('month', i.invoice_date), c.name, c.gstin, i.place_of_supply
      ORDER BY month DESC
    `

    // HSN Summary (GSTR-1 Table 12) — one row per HSN code, whichever source it came from.
    // Invoices created with line items store HSN per-line (invoice_line_items.hsn_code);
    // invoices created without line items store a single top-level HSN on the invoice itself
    // (see the hasLineItems branch in app/api/invoices/route.ts POST). Union both so every
    // invoice contributes exactly once, not zero or twice.
    const oid = String(Math.floor(orgId))
    const hsnSummary = await rawSql(`
      SELECT hsn_code, SUM(qty) AS total_qty, SUM(taxable_value) AS taxable_value, SUM(cgst) AS cgst, SUM(sgst) AS sgst, SUM(igst) AS igst, COUNT(DISTINCT invoice_id) AS invoice_count
      FROM (
        SELECT ili.hsn_code AS hsn_code, ili.invoice_id AS invoice_id, ili.qty AS qty, ili.amount AS taxable_value, (ili.amount * ili.cgst_rate / 100) AS cgst, (ili.amount * ili.sgst_rate / 100) AS sgst, ili.igst_amount AS igst
        FROM invoice_line_items ili
        JOIN invoices i ON ili.invoice_id = i.id
        WHERE i.org_id = ${oid} AND i.invoice_date >= '${startDate}' AND i.invoice_date <= '${endDate}' AND i.status != 'draft' AND ili.hsn_code IS NOT NULL
        UNION ALL
        SELECT i.hsn_code AS hsn_code, i.id AS invoice_id, 1 AS qty, i.amount_before_tax AS taxable_value, i.cgst_amount AS cgst, i.sgst_amount AS sgst, i.igst_amount AS igst
        FROM invoices i
        WHERE i.org_id = ${oid} AND i.invoice_date >= '${startDate}' AND i.invoice_date <= '${endDate}' AND i.status != 'draft' AND i.hsn_code IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM invoice_line_items ili2 WHERE ili2.invoice_id = i.id)
      ) combined
      GROUP BY hsn_code
      ORDER BY taxable_value DESC
    `.replace(/\s+/g, " ").trim())

    // Input GST per tax head (GSTR-3B Table 4A) — purchases already carry cgst/sgst/igst
    // separately, unlike the old lump "total input GST" the UI showed before.
    const inputGstByHead = await rawSql(`SELECT COALESCE(SUM(cgst), 0) AS cgst, COALESCE(SUM(sgst), 0) AS sgst, COALESCE(SUM(igst), 0) AS igst FROM purchases WHERE org_id = ${oid} AND invoice_date >= '${startDate}' AND invoice_date <= '${endDate}'`)

    // Calculate totals
    const totalOutputGST = outputGST.reduce((sum, row) => sum + Number(row.total_gst_collected || 0), 0)
    const totalReconciledGST = reconciledPayments.reduce((sum, row) => sum + Number(row.gst_on_received || 0), 0)
    const unreconciledGST = totalOutputGST - totalReconciledGST

    const outputByHead = {
      cgst: outputGST.reduce((s, r) => s + Number(r.total_cgst || 0), 0),
      sgst: outputGST.reduce((s, r) => s + Number(r.total_sgst || 0), 0),
      igst: outputGST.reduce((s, r) => s + Number(r.total_igst || 0), 0),
    }
    const inputByHead = {
      cgst: Number(inputGstByHead[0]?.cgst || 0),
      sgst: Number(inputGstByHead[0]?.sgst || 0),
      igst: Number(inputGstByHead[0]?.igst || 0),
    }

    return NextResponse.json({
      outputGST,
      reconciledPayments,
      b2bBreakdown,
      hsnSummary,
      summary: {
        totalOutputGST,
        totalReconciledGST,
        unreconciledGST,
        reconciledPercentage: totalOutputGST > 0 ? (totalReconciledGST / totalOutputGST) * 100 : 0,
        outputByHead,
        inputByHead,
        netByHead: {
          cgst: outputByHead.cgst - inputByHead.cgst,
          sgst: outputByHead.sgst - inputByHead.sgst,
          igst: outputByHead.igst - inputByHead.igst,
        },
      },
    })
  } catch (error) {
    console.error("Error generating GST report:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate GST report" },
      { status: 500 },
    )
  }
}
