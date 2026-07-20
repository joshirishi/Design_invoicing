import { type NextRequest, NextResponse } from "next/server"
import { sql, rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { postPaymentJournalEntry } from "@/lib/journal"

export async function GET(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))
    const { searchParams } = new URL(request.url)
    const unreconciled = searchParams.get("unreconciled") === "true"

    // Single-line rawSql — multi-line SELECTs with JOINs silently return empty via exec_sql RPC.
    // (Also: nesting a sql`` tagged template inside another sql`` template interpolates the
    // Promise itself, not the query text — build the WHERE clause as a plain string instead.)
    const whereClause = `p.org_id = ${oid}${unreconciled ? " AND p.reconciled = false" : ""}`
    const payments = await rawSql(
      `SELECT p.*, json_build_object('id', i.id, 'invoice_number', i.invoice_number, 'total_amount', i.total_amount, 'amount_before_tax', i.amount_before_tax) as invoice, json_build_object('id', c.id, 'name', c.name) as client FROM payments p LEFT JOIN invoices i ON p.invoice_id = i.id LEFT JOIN clients c ON i.client_id = c.id WHERE ${whereClause} ORDER BY p.payment_date DESC`,
    )
    return NextResponse.json(payments)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const data = await request.json()

    const result = await sql`
      INSERT INTO payments (
        org_id, invoice_id, client_id, amount, payment_date,
        payment_method, reference_number, notes, reconciled,
        tds_amount, tds_section
      )
      VALUES (
        ${orgId}, ${data.invoice_id}, ${data.client_id || null},
        ${data.amount}, ${data.payment_date}, ${data.payment_method || null},
        ${data.reference_number || null}, ${data.notes || null}, false,
        ${Number(data.tds_amount) || 0}, ${data.tds_section || null}
      )
      RETURNING *
    `
    const payment = result[0]

    // Epic 12 (US-50): post to the double-entry ledger, best-effort.
    if (payment?.id) {
      try {
        await postPaymentJournalEntry(orgId, {
          id: Number(payment.id),
          payment_date: payment.payment_date,
          amount: Number(payment.amount),
          tds_amount: Number(payment.tds_amount) || 0,
          payment_method: payment.payment_method,
          reference_number: payment.reference_number,
        })
      } catch (journalError: any) {
        console.error("Journal posting failed for payment", payment.id, journalError.message)
      }
    }

    return NextResponse.json(payment)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
