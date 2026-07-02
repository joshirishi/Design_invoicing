import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { NextResponse } from "next/server"
import { Resend } from "resend"

// GET /api/notify/digest
// Called by Vercel Cron daily at 10pm IST (4:30pm UTC).
// Sends a digest email if there are action items.
// Set NOTIFICATION_EMAIL in env to control the recipient.

const CRON_SECRET = process.env.CRON_SECRET

const GST_DOC_LABELS: Record<string, string> = {
  gstr2b: "GSTR-2B (ITC Statement)",
  gstr1: "GSTR-1 (Outward Supplies)",
  gstr3b: "GSTR-3B (Monthly Return)",
  gstr9: "GSTR-9 (Annual Return)",
  reg_cert: "GST Registration Certificate",
  challan: "PMT-06 Payment Challan",
}

function fmt(n: number) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function buildDigestHtml(data: {
  overdueInvoices: Array<{ invoice_number: string; total_amount: number; invoice_date: string; daysOverdue: number }>
  unreconciledCredits: Array<{ description: string; credit: number; transaction_date: string }>
  unreconciledDebits: Array<{ description: string; debit: number; transaction_date: string }>
  gstOverdue: Array<{ doc_type: string; due_date: string | null; daysOverdue: number }>
  gstDueSoon: Array<{ doc_type: string; due_date: string | null; daysLeft: number }>
  appUrl: string
}): string {
  const totalItems =
    data.overdueInvoices.length +
    data.unreconciledCredits.length +
    data.unreconciledDebits.length +
    data.gstOverdue.length +
    data.gstDueSoon.length

  if (totalItems === 0) return ""

  const overdueSection = data.overdueInvoices.length > 0 ? `
    <h2 style="font-size:16px;font-weight:700;margin:24px 0 12px;color:#dc2626">
      Overdue Invoices (${data.overdueInvoices.length})
    </h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#fef2f2">
          <th style="text-align:left;padding:8px 12px;color:#666">Invoice</th>
          <th style="text-align:left;padding:8px 12px;color:#666">Date</th>
          <th style="text-align:left;padding:8px 12px;color:#666">Days Overdue</th>
          <th style="text-align:right;padding:8px 12px;color:#666">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${data.overdueInvoices.map((inv) => `
          <tr style="border-top:1px solid #fecaca">
            <td style="padding:8px 12px;font-weight:600">${inv.invoice_number}</td>
            <td style="padding:8px 12px;color:#555">${fmtDate(inv.invoice_date)}</td>
            <td style="padding:8px 12px;color:#dc2626;font-weight:600">${inv.daysOverdue}d</td>
            <td style="padding:8px 12px;text-align:right">${fmt(inv.total_amount)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>` : ""

  const creditSection = data.unreconciledCredits.length > 0 ? `
    <h2 style="font-size:16px;font-weight:700;margin:24px 0 12px;color:#16a34a">
      Unreconciled Credits (${data.unreconciledCredits.length})
    </h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#f0fdf4">
          <th style="text-align:left;padding:8px 12px;color:#666">Description</th>
          <th style="text-align:left;padding:8px 12px;color:#666">Date</th>
          <th style="text-align:right;padding:8px 12px;color:#666">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${data.unreconciledCredits.map((tx) => `
          <tr style="border-top:1px solid #bbf7d0">
            <td style="padding:8px 12px;font-weight:600">${tx.description}</td>
            <td style="padding:8px 12px;color:#555">${fmtDate(tx.transaction_date)}</td>
            <td style="padding:8px 12px;text-align:right;color:#16a34a;font-weight:600">+${fmt(tx.credit)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>` : ""

  const debitSection = data.unreconciledDebits.length > 0 ? `
    <h2 style="font-size:16px;font-weight:700;margin:24px 0 12px;color:#d97706">
      Unreconciled Debits (${data.unreconciledDebits.length})
    </h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#fffbeb">
          <th style="text-align:left;padding:8px 12px;color:#666">Description</th>
          <th style="text-align:left;padding:8px 12px;color:#666">Date</th>
          <th style="text-align:right;padding:8px 12px;color:#666">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${data.unreconciledDebits.map((tx) => `
          <tr style="border-top:1px solid #fde68a">
            <td style="padding:8px 12px;font-weight:600">${tx.description}</td>
            <td style="padding:8px 12px;color:#555">${fmtDate(tx.transaction_date)}</td>
            <td style="padding:8px 12px;text-align:right;color:#d97706;font-weight:600">−${fmt(tx.debit)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>` : ""

  // GST overdue section
  const gstOverdueSection = data.gstOverdue.length > 0 ? `
    <h2 style="font-size:16px;font-weight:700;margin:24px 0 8px;color:#dc2626">
      GST Documents — Overdue (${data.gstOverdue.length})
    </h2>
    <p style="font-size:12px;color:#777;margin:0 0 10px">These documents were due but have not been uploaded to InvoiceFlow.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#fef2f2">
          <th style="text-align:left;padding:8px 12px;color:#666">Document</th>
          <th style="text-align:left;padding:8px 12px;color:#666">Due Date</th>
          <th style="text-align:left;padding:8px 12px;color:#666">Days Overdue</th>
        </tr>
      </thead>
      <tbody>
        ${data.gstOverdue.map((d) => `
          <tr style="border-top:1px solid #fecaca">
            <td style="padding:8px 12px;font-weight:600">${GST_DOC_LABELS[d.doc_type] || d.doc_type}</td>
            <td style="padding:8px 12px;color:#555">${d.due_date ? fmtDate(d.due_date) : "—"}</td>
            <td style="padding:8px 12px;color:#dc2626;font-weight:600">${d.daysOverdue}d</td>
          </tr>
        `).join("")}
      </tbody>
    </table>` : ""

  // GST due soon section
  const gstDueSoonSection = data.gstDueSoon.length > 0 ? `
    <h2 style="font-size:16px;font-weight:700;margin:24px 0 8px;color:#d97706">
      GST Documents — Due Soon (${data.gstDueSoon.length})
    </h2>
    <p style="font-size:12px;color:#777;margin:0 0 10px">Download from gst.gov.in and upload to InvoiceFlow before the deadline.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#fffbeb">
          <th style="text-align:left;padding:8px 12px;color:#666">Document</th>
          <th style="text-align:left;padding:8px 12px;color:#666">Due Date</th>
          <th style="text-align:left;padding:8px 12px;color:#666">Days Left</th>
        </tr>
      </thead>
      <tbody>
        ${data.gstDueSoon.map((d) => `
          <tr style="border-top:1px solid #fde68a">
            <td style="padding:8px 12px;font-weight:600">${GST_DOC_LABELS[d.doc_type] || d.doc_type}</td>
            <td style="padding:8px 12px;color:#555">${d.due_date ? fmtDate(d.due_date) : "—"}</td>
            <td style="padding:8px 12px;color:#d97706;font-weight:600">${d.daysLeft}d</td>
          </tr>
        `).join("")}
      </tbody>
    </table>` : ""

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f5;margin:0;padding:0">
  <div style="max-width:640px;margin:0 auto;background:#fff">
    <div style="background:#1a1a2e;padding:24px 32px">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700">InvoiceFlow Daily Digest</h1>
      <p style="color:#a3a3cc;margin:4px 0 0;font-size:13px">${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
    </div>
    <div style="padding:24px 32px">
      ${gstOverdueSection}
      ${gstDueSoonSection}
      ${overdueSection}
      ${creditSection}
      ${debitSection}
      <div style="margin-top:28px;display:flex;gap:12px;flex-wrap:wrap">
        <a href="${data.appUrl}/dashboard/gst-report"
           style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600">
          GST Documents →
        </a>
        <a href="${data.appUrl}/dashboard/reconciliation"
           style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600">
          Open Reconciliation →
        </a>
      </div>
    </div>
    <div style="background:#f4f4f5;padding:16px 32px;font-size:11px;color:#888;text-align:center">
      This is an automated digest from InvoiceFlow. To stop receiving these, remove the Vercel Cron.
    </div>
  </div>
</body>
</html>`
}

export async function GET(request: Request) {
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const resendKey = process.env.RESEND_API_KEY
  const toEmail = process.env.NOTIFICATION_EMAIL

  if (!resendKey || !toEmail) {
    return NextResponse.json(
      { error: "RESEND_API_KEY and NOTIFICATION_EMAIL must be set to send digest emails" },
      { status: 500 },
    )
  }

  try {
    const orgId = await getCurrentOrgId()

    // Overdue invoices
    const overdueRows = await sql`
      SELECT id, invoice_number, total_amount, invoice_date, payment_due_days
      FROM invoices
      WHERE org_id = ${orgId}
        AND status IN ('unpaid', 'overdue')
        AND invoice_date + (payment_due_days || ' days')::INTERVAL < NOW()
      ORDER BY invoice_date ASC
    `

    // Unreconciled credits older than 7 days
    const unreconciledCreditRows = await sql`
      SELECT id, description, credit, transaction_date
      FROM bank_transactions
      WHERE org_id = ${orgId}
        AND reconciled = false
        AND credit IS NOT NULL AND credit > 0
        AND created_at < NOW() - INTERVAL '7 days'
      ORDER BY transaction_date DESC
      LIMIT 20
    `

    // Unreconciled debits older than 3 days
    const unreconciledDebitRows = await sql`
      SELECT id, description, debit, transaction_date
      FROM bank_transactions
      WHERE org_id = ${orgId}
        AND reconciled = false
        AND debit IS NOT NULL AND debit > 0
        AND (
          LOWER(description) LIKE '%infinity%'
          OR LOWER(description) LIKE '%cc payment%'
          OR LOWER(description) LIKE '%credit card%'
        )
        AND created_at < NOW() - INTERVAL '3 days'
      ORDER BY transaction_date DESC
      LIMIT 20
    `

    // GST documents overdue (due_date < today, not uploaded)
    const gstOverdueRows = await sql`
      SELECT doc_type, due_date
      FROM gst_documents
      WHERE org_id = ${orgId}
        AND status != 'uploaded'
        AND due_date IS NOT NULL
        AND due_date < CURRENT_DATE
      ORDER BY due_date ASC
    `

    // GST documents due within 5 days (not yet uploaded)
    const gstDueSoonRows = await sql`
      SELECT doc_type, due_date
      FROM gst_documents
      WHERE org_id = ${orgId}
        AND status != 'uploaded'
        AND due_date IS NOT NULL
        AND due_date >= CURRENT_DATE
        AND due_date <= CURRENT_DATE + INTERVAL '5 days'
      ORDER BY due_date ASC
    `

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const overdueInvoices = overdueRows.map((inv) => {
      const dueDate = new Date(inv.invoice_date as string)
      dueDate.setDate(dueDate.getDate() + (inv.payment_due_days as number))
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      return { ...inv, daysOverdue: Math.max(0, daysOverdue) }
    }) as Array<{ invoice_number: string; total_amount: number; invoice_date: string; daysOverdue: number }>

    const gstOverdue = gstOverdueRows.map((d) => ({
      doc_type: d.doc_type as string,
      due_date: d.due_date as string | null,
      daysOverdue: d.due_date
        ? Math.max(0, Math.floor((today.getTime() - new Date(d.due_date as string).getTime()) / (1000 * 60 * 60 * 24)))
        : 0,
    }))

    const gstDueSoon = gstDueSoonRows.map((d) => ({
      doc_type: d.doc_type as string,
      due_date: d.due_date as string | null,
      daysLeft: d.due_date
        ? Math.max(0, Math.ceil((new Date(d.due_date as string).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
        : 0,
    }))

    const totalActionItems =
      overdueInvoices.length +
      unreconciledCreditRows.length +
      unreconciledDebitRows.length +
      gstOverdue.length +
      gstDueSoon.length

    if (totalActionItems === 0) {
      return NextResponse.json({ sent: false, reason: "No action items — digest skipped" })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000"

    const html = buildDigestHtml({
      overdueInvoices,
      unreconciledCredits: unreconciledCreditRows as Array<{ description: string; credit: number; transaction_date: string }>,
      unreconciledDebits: unreconciledDebitRows as Array<{ description: string; debit: number; transaction_date: string }>,
      gstOverdue,
      gstDueSoon,
      appUrl,
    })

    const resend = new Resend(resendKey)
    const { data, error } = await resend.emails.send({
      from: "InvoiceFlow <digest@resend.dev>",
      to: [toEmail],
      subject: `Finance Digest — ${totalActionItems} item${totalActionItems > 1 ? "s" : ""} need attention`,
      html,
    })

    if (error) throw new Error(error.message)

    return NextResponse.json({ sent: true, emailId: data?.id, actionItems: totalActionItems })
  } catch (error) {
    console.error("[notify/digest] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Digest failed" },
      { status: 500 },
    )
  }
}
