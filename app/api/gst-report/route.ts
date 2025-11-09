import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate") || "2024-01-01"
    const endDate = searchParams.get("endDate") || "2025-12-31"

    // Get GST collected (Output GST) from invoices
    const outputGST = await sql`
      SELECT 
        DATE_TRUNC('month', issue_date) as month,
        SUM(tax) as total_gst_collected,
        COUNT(*) as invoice_count
      FROM invoices
      WHERE issue_date >= ${startDate}::date 
        AND issue_date <= ${endDate}::date
        AND status != 'draft'
      GROUP BY DATE_TRUNC('month', issue_date)
      ORDER BY month DESC
    `

    // Get reconciled payments with GST breakdown
    const reconciledPayments = await sql`
      SELECT 
        DATE_TRUNC('month', p.payment_date) as month,
        SUM(p.amount) as total_received,
        SUM(i.tax) as gst_on_received,
        COUNT(*) as payment_count
      FROM payments p
      INNER JOIN invoices i ON p.invoice_id = i.id
      WHERE p.reconciled = true
        AND p.payment_date >= ${startDate}::date 
        AND p.payment_date <= ${endDate}::date
      GROUP BY DATE_TRUNC('month', p.payment_date)
      ORDER BY month DESC
    `

    // Calculate totals
    const totalOutputGST = outputGST.reduce((sum, row) => sum + Number(row.total_gst_collected || 0), 0)
    const totalReconciledGST = reconciledPayments.reduce((sum, row) => sum + Number(row.gst_on_received || 0), 0)
    const unreconciledGST = totalOutputGST - totalReconciledGST

    return NextResponse.json({
      outputGST,
      reconciledPayments,
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
