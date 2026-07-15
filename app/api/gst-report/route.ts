import { sql } from "@/lib/db"
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

    // Calculate totals
    const totalOutputGST = outputGST.reduce((sum, row) => sum + Number(row.total_gst_collected || 0), 0)
    const totalReconciledGST = reconciledPayments.reduce((sum, row) => sum + Number(row.gst_on_received || 0), 0)
    const unreconciledGST = totalOutputGST - totalReconciledGST

    return NextResponse.json({
      outputGST,
      reconciledPayments,
      b2bBreakdown,
      summary: {
        totalOutputGST,
        totalReconciledGST,
        unreconciledGST,
        reconciledPercentage: totalOutputGST > 0 ? (totalReconciledGST / totalOutputGST) * 100 : 0,
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
