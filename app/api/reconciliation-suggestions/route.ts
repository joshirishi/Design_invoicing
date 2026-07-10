import { NextRequest, NextResponse } from "next/server"
import { sql, rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { POST as createInvoice } from "@/app/api/invoices/route"
import { POST as createPurchase } from "@/app/api/purchases/route"

// GET /api/reconciliation-suggestions?status=pending — list suggestions for review
export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))
    const status = new URL(request.url).searchParams.get("status") || "pending"
    const safeStatus = status.replace(/'/g, "''")

    // Single-line rawSql — multi-line sql`` with JOINs fails silently via exec_sql RPC
    const rows = await rawSql(`SELECT rs.id, rs.suggestion_type, rs.chart_account_id, rs.suggested_payload, rs.confidence, rs.status, rs.created_at, bt.id AS bank_transaction_id, bt.transaction_date, bt.description AS bank_description, bt.debit, bt.credit, ca.name AS account_name FROM reconciliation_suggestions rs JOIN bank_transactions bt ON rs.bank_transaction_id = bt.id LEFT JOIN chart_of_accounts ca ON rs.chart_account_id = ca.id WHERE rs.org_id = ${oid} AND rs.status = '${safeStatus}' ORDER BY bt.transaction_date DESC`)

    return NextResponse.json(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Internally invokes another route's POST handler, reusing its business logic
// (client/vendor resolution, GST math, invoice numbering) without duplicating it.
async function callInternalPost(handler: (req: NextRequest) => Promise<Response>, payload: unknown) {
  const req = new NextRequest("http://internal.local/api/internal", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json" },
  })
  const res = await handler(req)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || "Failed to create record from suggestion")
  return json
}

// PATCH /api/reconciliation-suggestions — accept a suggestion (with possibly-edited payload),
// creating the real invoice/purchase, linking + reconciling the bank transaction.
export async function PATCH(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))
    const { id, payload } = await request.json()
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

    const rows = await rawSql(`SELECT id, suggestion_type, bank_transaction_id, chart_account_id, suggested_payload FROM reconciliation_suggestions WHERE id = ${Number(id)} AND org_id = ${oid} AND status = 'pending' LIMIT 1`)
    const suggestion = rows[0]
    if (!suggestion) return NextResponse.json({ error: "Suggestion not found or already resolved" }, { status: 404 })

    const bankTxId = String(suggestion.bank_transaction_id)
    const finalPayload = { ...(suggestion.suggested_payload as Record<string, unknown>), ...(payload ?? {}) }

    if (suggestion.suggestion_type === "invoice") {
      const invoice = await callInternalPost(createInvoice, finalPayload)

      // Mirror the auto-reconcile income path: the money already arrived (it's the
      // bank credit itself), so immediately record + reconcile the payment.
      const paymentRows = await sql`INSERT INTO payments (org_id, invoice_id, client_id, amount, payment_date, payment_method, notes, reconciled)
        SELECT ${orgId}, ${invoice.id}, client_id, ${invoice.total_amount}, ${invoice.invoice_date}, 'bank_transfer',
               'Created from bank reconciliation suggestion', true
        FROM invoices WHERE id = ${invoice.id}
        RETURNING id`
      const paymentId = String(paymentRows[0]?.id)

      await sql`UPDATE bank_transactions SET reconciled = true, payment_id = ${paymentId} WHERE id = ${bankTxId}`
      await sql`UPDATE invoices SET status = 'paid', updated_at = NOW() WHERE id = ${invoice.id}`
      await rawSql(`UPDATE reconciliation_suggestions SET status = 'accepted', updated_at = NOW() WHERE id = ${Number(id)}`)

      return NextResponse.json({ success: true, invoice })
    }

    if (suggestion.suggestion_type === "purchase") {
      const purchase = await callInternalPost(createPurchase, finalPayload)

      await sql`UPDATE bank_transactions SET reconciled = true, purchase_id = ${purchase.id} WHERE id = ${bankTxId}`
      await rawSql(`UPDATE reconciliation_suggestions SET status = 'accepted', updated_at = NOW() WHERE id = ${Number(id)}`)

      return NextResponse.json({ success: true, purchase })
    }

    return NextResponse.json({ error: `Unknown suggestion_type: ${suggestion.suggestion_type}` }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/reconciliation-suggestions?id=123 — dismiss a suggestion (won't be re-suggested)
export async function DELETE(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))
    const id = new URL(request.url).searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

    await rawSql(`UPDATE reconciliation_suggestions SET status = 'dismissed', updated_at = NOW() WHERE id = ${Number(id)} AND org_id = ${oid}`)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
