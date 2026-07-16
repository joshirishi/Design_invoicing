// Double-entry journal posting (Epic 12 — US-50/51/52).
//
// Mirrors the debit/credit logic already proven correct in lib/tally-xml.ts
// (Sales/Purchase/Receipt vouchers) so the ledger and the Tally export never
// disagree about which account gets debited vs credited for the same event.
//
// Scope: forward-only. New invoices/payments/purchases post here going
// forward; historical backfill is a separate follow-up story (see
// USER-STORIES.md Epic 12, Priya's feasibility note).
//
// NOTE: every query here is a single-line sql`` tagged template. Multi-line
// SELECTs silently return empty rows via the exec_sql RPC — see the same
// warning in app/dashboard/ledger/page.tsx and app/api/invoices/route.ts.

import { sql } from "@/lib/db"

export interface JournalLineInput {
  account_id: number
  debit: number
  credit: number
}

const BALANCE_TOLERANCE = 0.01 // paise-level float rounding

async function resolveAccountId(orgId: number, accountName: string): Promise<number> {
  const rows = await sql`SELECT id FROM chart_of_accounts WHERE (org_id IS NULL OR org_id = ${orgId}) AND name = ${accountName} AND is_active = true ORDER BY (org_id IS NULL) ASC LIMIT 1`
  if (rows.length === 0) {
    throw new Error(`Chart of Accounts is missing "${accountName}" — run /api/migrations/sprint2 to seed standard accounts.`)
  }
  return Number(rows[0].id)
}

async function postEntry(
  orgId: number,
  params: {
    date: string
    narration: string | null
    sourceType: "invoice" | "payment" | "purchase" | "manual"
    sourceId: number | null
    lines: JournalLineInput[]
  },
): Promise<number> {
  const totalDebit = params.lines.reduce((s, l) => s + l.debit, 0)
  const totalCredit = params.lines.reduce((s, l) => s + l.credit, 0)
  if (Math.abs(totalDebit - totalCredit) > BALANCE_TOLERANCE) {
    throw new Error(
      `Journal entry does not balance: debit ${totalDebit.toFixed(2)} ≠ credit ${totalCredit.toFixed(2)}`,
    )
  }

  const header = await sql`INSERT INTO journal_entries (org_id, entry_date, narration, source_type, source_id) VALUES (${orgId}, ${params.date}, ${params.narration}, ${params.sourceType}, ${params.sourceId}) RETURNING id`
  const entryId = Number(header[0]?.id)
  if (!entryId) throw new Error("Failed to create journal entry header")

  for (const line of params.lines) {
    if (line.debit === 0 && line.credit === 0) continue
    await sql`INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit) VALUES (${entryId}, ${line.account_id}, ${line.debit}, ${line.credit})`
  }

  return entryId
}

// ─── Invoice → Sales entry (Dr Sundry Debtors, Cr Income + Output Tax) ────────

export async function postInvoiceJournalEntry(
  orgId: number,
  invoice: {
    id: number
    invoice_number: string
    invoice_date: string
    description: string | null
    amount_before_tax: number
    cgst_amount: number
    sgst_amount: number
    igst_amount: number
    total_amount: number
  },
): Promise<number> {
  const [debtors, income] = await Promise.all([
    resolveAccountId(orgId, "Sundry Debtors"),
    resolveAccountId(orgId, "Service Income"),
  ])

  const lines: JournalLineInput[] = [
    { account_id: debtors, debit: invoice.total_amount, credit: 0 },
    { account_id: income, debit: 0, credit: invoice.amount_before_tax },
  ]

  if (invoice.igst_amount > 0) {
    const igst = await resolveAccountId(orgId, "Output IGST")
    lines.push({ account_id: igst, debit: 0, credit: invoice.igst_amount })
  } else {
    if (invoice.cgst_amount > 0) {
      const cgst = await resolveAccountId(orgId, "Output CGST")
      lines.push({ account_id: cgst, debit: 0, credit: invoice.cgst_amount })
    }
    if (invoice.sgst_amount > 0) {
      const sgst = await resolveAccountId(orgId, "Output SGST")
      lines.push({ account_id: sgst, debit: 0, credit: invoice.sgst_amount })
    }
  }

  return postEntry(orgId, {
    date: invoice.invoice_date,
    narration: `Invoice ${invoice.invoice_number}${invoice.description ? ` — ${invoice.description}` : ""}`,
    sourceType: "invoice",
    sourceId: invoice.id,
    lines,
  })
}

// ─── Payment → Receipt entry (Dr Bank/TDS Receivable, Cr Sundry Debtors) ──────

export async function postPaymentJournalEntry(
  orgId: number,
  payment: {
    id: number
    payment_date: string
    amount: number
    tds_amount: number
    payment_method: string | null
    reference_number: string | null
  },
): Promise<number> {
  const bankLedgerName = payment.payment_method?.toLowerCase().includes("cash") ? "Cash in Hand" : "Bank Account"
  const [bank, debtors] = await Promise.all([
    resolveAccountId(orgId, bankLedgerName),
    resolveAccountId(orgId, "Sundry Debtors"),
  ])

  const netBankAmount = payment.amount - (payment.tds_amount || 0)
  const lines: JournalLineInput[] = [
    { account_id: bank, debit: netBankAmount, credit: 0 },
  ]

  if ((payment.tds_amount || 0) > 0) {
    const tdsReceivable = await resolveAccountId(orgId, "TDS Receivable")
    lines.push({ account_id: tdsReceivable, debit: payment.tds_amount, credit: 0 })
  }

  lines.push({ account_id: debtors, debit: 0, credit: payment.amount })

  return postEntry(orgId, {
    date: payment.payment_date,
    narration: `Payment received${payment.reference_number ? ` — Ref: ${payment.reference_number}` : ""}`,
    sourceType: "payment",
    sourceId: payment.id,
    lines,
  })
}

// ─── Purchase → Purchase entry (Dr Purchases + Input Tax, Cr Sundry Creditors) ─

export async function postPurchaseJournalEntry(
  orgId: number,
  purchase: {
    id: number
    invoice_number: string | null
    invoice_date: string
    vendor_name: string
    description: string | null
    amount: number
    cgst: number
    sgst: number
    igst: number
    total_with_tax: number
  },
): Promise<number> {
  const [creditors, purchases] = await Promise.all([
    resolveAccountId(orgId, "Sundry Creditors"),
    resolveAccountId(orgId, "Direct Purchases"),
  ])

  const lines: JournalLineInput[] = [
    { account_id: purchases, debit: purchase.amount, credit: 0 },
    { account_id: creditors, debit: 0, credit: purchase.total_with_tax },
  ]

  if (purchase.igst > 0) {
    const igst = await resolveAccountId(orgId, "Input IGST (ITC)")
    lines.push({ account_id: igst, debit: purchase.igst, credit: 0 })
  } else {
    if (purchase.cgst > 0) {
      const cgst = await resolveAccountId(orgId, "Input CGST (ITC)")
      lines.push({ account_id: cgst, debit: purchase.cgst, credit: 0 })
    }
    if (purchase.sgst > 0) {
      const sgst = await resolveAccountId(orgId, "Input SGST (ITC)")
      lines.push({ account_id: sgst, debit: purchase.sgst, credit: 0 })
    }
  }

  const invRef = purchase.invoice_number ? `Inv# ${purchase.invoice_number} — ` : ""
  return postEntry(orgId, {
    date: purchase.invoice_date,
    narration: `${invRef}${purchase.description || purchase.vendor_name}`,
    sourceType: "purchase",
    sourceId: purchase.id,
    lines,
  })
}

// ─── Manual entry (US-51) ──────────────────────────────────────────────────

export async function createManualJournalEntry(
  orgId: number,
  params: { date: string; narration: string; lines: JournalLineInput[] },
): Promise<number> {
  if (params.lines.length < 2) {
    throw new Error("A journal entry needs at least two lines (one debit, one credit).")
  }
  return postEntry(orgId, {
    date: params.date,
    narration: params.narration,
    sourceType: "manual",
    sourceId: null,
    lines: params.lines,
  })
}

// ─── Trial balance (US-52) ──────────────────────────────────────────────────

export async function getTrialBalance(orgId: number) {
  return sql`SELECT a.id AS account_id, a.name AS account_name, a.type AS account_type, COALESCE(SUM(l.debit), 0) AS debit, COALESCE(SUM(l.credit), 0) AS credit FROM chart_of_accounts a JOIN journal_entry_lines l ON l.account_id = a.id JOIN journal_entries e ON e.id = l.entry_id WHERE e.org_id = ${orgId} GROUP BY a.id, a.name, a.type ORDER BY a.type, a.name`
}
