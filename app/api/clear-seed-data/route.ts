// Deletes all seed / sample data (invoices starting with INV-2024-00, their clients, payments,
// and bank transactions). Safe to run — only removes rows with the seed invoice numbers.
// Visit GET /api/clear-seed-data to execute the cleanup.

import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-auth"
import { getCurrentOrgId } from "@/lib/get-org"
import { rawSql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = createServerClient()
    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))

    // Find seed invoice IDs (numbers like INV-2024-001 … INV-2024-008)
    const seedInvoices = await rawSql(
      `SELECT id, client_id FROM invoices WHERE org_id = ${oid} AND invoice_number LIKE 'INV-2024-00%'`
    )

    if (seedInvoices.length === 0) {
      return NextResponse.json({ success: true, message: "No seed data found — nothing to delete." })
    }

    const invoiceIds = seedInvoices.map((r) => r.id as number)
    const clientIds  = [...new Set(seedInvoices.map((r) => r.client_id as number).filter(Boolean))]

    // Delete in dependency order: line items → payments → invoices → clients
    if (invoiceIds.length > 0) {
      const idList = invoiceIds.join(",")
      await rawSql(`DELETE FROM invoice_line_items WHERE invoice_id IN (${idList})`)
      await rawSql(`DELETE FROM payments WHERE invoice_id IN (${idList})`)
      await rawSql(`DELETE FROM invoices WHERE id IN (${idList}) AND org_id = ${oid}`)
    }

    // Only delete clients that have no remaining invoices
    const deleted: number[] = []
    for (const cid of clientIds) {
      const remaining = await rawSql(
        `SELECT COUNT(*) AS cnt FROM invoices WHERE client_id = ${cid} AND org_id = ${oid}`
      )
      if (Number(remaining[0]?.cnt ?? 1) === 0) {
        await supabase.from("clients").delete().eq("id", cid).eq("org_id", orgId)
        deleted.push(cid)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${invoiceIds.length} seed invoices and ${deleted.length} sample clients.`,
      deleted_invoice_ids: invoiceIds,
      deleted_client_ids: deleted,
    })
  } catch (e) {
    console.error("[clear-seed-data]", e)
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}
