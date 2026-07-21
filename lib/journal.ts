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

// ─── Payee payment → Salary/Contractor entry (Epic 18, US-69/71) ─────────────
// Dr Salary & Wages (gross) — Cr TDS Payable (tax withheld, owed to govt) — Cr Bank (net paid)

export async function postPayeePaymentJournalEntry(
  orgId: number,
  payment: {
    id: number
    payee_name: string
    payment_date: string
    amount: number
    tds_amount: number
    payment_method: string | null
    reference_number: string | null
    pf_amount?: number
    esi_amount?: number
    professional_tax_amount?: number
  },
): Promise<number> {
  const bankLedgerName = payment.payment_method?.toLowerCase().includes("cash") ? "Cash in Hand" : "Bank Account"
  const [salary, bank] = await Promise.all([
    resolveAccountId(orgId, "Salary & Wages"),
    resolveAccountId(orgId, bankLedgerName),
  ])

  const tds = payment.tds_amount || 0
  const pf = payment.pf_amount || 0
  const esi = payment.esi_amount || 0
  const pt = payment.professional_tax_amount || 0
  const netAmount = payment.amount - tds - pf - esi - pt

  const lines: JournalLineInput[] = [
    { account_id: salary, debit: payment.amount, credit: 0 },
  ]

  if (tds > 0) {
    const tdsPayable = await resolveAccountId(orgId, "TDS Payable")
    lines.push({ account_id: tdsPayable, debit: 0, credit: tds })
  }
  if (pf > 0) {
    const pfPayable = await resolveAccountId(orgId, "PF Payable")
    lines.push({ account_id: pfPayable, debit: 0, credit: pf })
  }
  if (esi > 0) {
    const esiPayable = await resolveAccountId(orgId, "ESI Payable")
    lines.push({ account_id: esiPayable, debit: 0, credit: esi })
  }
  if (pt > 0) {
    const ptPayable = await resolveAccountId(orgId, "Professional Tax Payable")
    lines.push({ account_id: ptPayable, debit: 0, credit: pt })
  }

  lines.push({ account_id: bank, debit: 0, credit: netAmount })

  return postEntry(orgId, {
    date: payment.payment_date,
    narration: `Payment to ${payment.payee_name}${payment.reference_number ? ` — Ref: ${payment.reference_number}` : ""}`,
    sourceType: "payment",
    sourceId: payment.id,
    lines,
  })
}

// ─── Capital gain → STCG/LTCG entry (Epic 17 Pass 2) ──────────────────────────
// Posts only the realized gain/loss (not the full sale proceeds — there is no
// investment-asset sub-ledger tracking cost basis as a balance-sheet item in
// this pass), so the P&L impact is correct without needing full trade-level
// asset accounting. Dr the demat/bank account holding the proceeds if known,
// otherwise Dr a generic "Bank Account" — Cr the matching capital-gains head.

export async function postCapitalGainJournalEntry(
  orgId: number,
  gain: {
    id: number
    symbol: string
    gain_amount: number
    gain_type: "STCG" | "LTCG"
    financial_year: string | null
  },
): Promise<number> {
  if (gain.gain_amount === 0) {
    throw new Error("Zero-gain entries are not posted to the ledger")
  }

  const incomeAccountName = gain.gain_type === "STCG" ? "Short-Term Capital Gains" : "Long-Term Capital Gains"
  const [income, bank] = await Promise.all([
    resolveAccountId(orgId, incomeAccountName),
    resolveAccountId(orgId, "Bank Account"),
  ])

  const amount = Math.abs(gain.gain_amount)
  const isProfit = gain.gain_amount > 0

  const lines: JournalLineInput[] = isProfit
    ? [
        { account_id: bank, debit: amount, credit: 0 },
        { account_id: income, debit: 0, credit: amount },
      ]
    : [
        { account_id: income, debit: amount, credit: 0 },
        { account_id: bank, debit: 0, credit: amount },
      ]

  return postEntry(orgId, {
    date: gain.financial_year ? `${gain.financial_year.slice(0, 4)}-04-01` : new Date().toISOString().split("T")[0],
    narration: `${gain.gain_type} on ${gain.symbol}${gain.financial_year ? ` (FY${gain.financial_year})` : ""}`,
    sourceType: "manual",
    sourceId: gain.id,
    lines,
  })
}

// ─── Profit & Loss (Epic 15, US-57) ─────────────────────────────────────────
// Period-scoped: sums each Income/Expense account's activity between two
// dates. Income accounts read as credit-heavy (net = credit − debit);
// Expense accounts read as debit-heavy (net = debit − credit) — the opposite
// convention, matching how those account types behave in double-entry.

export interface PnlAccountRow {
  account_id: number
  account_name: string
  account_type: "Income" | "Expense"
  net: number
}

export async function getProfitAndLoss(orgId: number, startDate: string, endDate: string) {
  const rows = await sql`SELECT a.id AS account_id, a.name AS account_name, a.type AS account_type, COALESCE(SUM(l.debit), 0) AS debit, COALESCE(SUM(l.credit), 0) AS credit FROM chart_of_accounts a JOIN journal_entry_lines l ON l.account_id = a.id JOIN journal_entries e ON e.id = l.entry_id WHERE e.org_id = ${orgId} AND a.type IN ('Income', 'Expense') AND e.entry_date >= ${startDate} AND e.entry_date <= ${endDate} GROUP BY a.id, a.name, a.type ORDER BY a.type, a.name`

  const income: PnlAccountRow[] = []
  const expense: PnlAccountRow[] = []
  for (const r of rows) {
    const debit = Number(r.debit)
    const credit = Number(r.credit)
    if (r.account_type === "Income") {
      income.push({ account_id: Number(r.account_id), account_name: String(r.account_name), account_type: "Income", net: credit - debit })
    } else {
      expense.push({ account_id: Number(r.account_id), account_name: String(r.account_name), account_type: "Expense", net: debit - credit })
    }
  }

  const totalIncome = income.reduce((s, r) => s + r.net, 0)
  const totalExpense = expense.reduce((s, r) => s + r.net, 0)

  return { income, expense, totalIncome, totalExpense, netProfit: totalIncome - totalExpense }
}

// ─── Balance Sheet (Epic 15, US-58) ─────────────────────────────────────────
// Point-in-time, not period-scoped: every journal line from inception up to
// asOfDate. Asset accounts read debit-heavy (net = debit − credit);
// Liability and Equity accounts read credit-heavy (net = credit − debit).
//
// There is no formal period-close journal entry in this system (real
// double-entry bookkeeping "closes" P&L accounts into Retained Earnings at
// year-end) — so cumulative net profit-to-date is computed here and shown as
// a synthetic "Retained Earnings (current period)" line, explicitly labeled
// as computed rather than posted, so Assets = Liabilities + Equity holds.

export interface BalanceSheetAccountRow {
  account_id: number
  account_name: string
  account_type: "Asset" | "Liability" | "Equity"
  net: number
}

export async function getBalanceSheet(orgId: number, asOfDate: string) {
  const rows = await sql`SELECT a.id AS account_id, a.name AS account_name, a.type AS account_type, COALESCE(SUM(l.debit), 0) AS debit, COALESCE(SUM(l.credit), 0) AS credit FROM chart_of_accounts a JOIN journal_entry_lines l ON l.account_id = a.id JOIN journal_entries e ON e.id = l.entry_id WHERE e.org_id = ${orgId} AND a.type IN ('Asset', 'Liability', 'Equity') AND e.entry_date <= ${asOfDate} GROUP BY a.id, a.name, a.type ORDER BY a.type, a.name`

  const assets: BalanceSheetAccountRow[] = []
  const liabilities: BalanceSheetAccountRow[] = []
  const equity: BalanceSheetAccountRow[] = []
  for (const r of rows) {
    const debit = Number(r.debit)
    const credit = Number(r.credit)
    if (r.account_type === "Asset") {
      assets.push({ account_id: Number(r.account_id), account_name: String(r.account_name), account_type: "Asset", net: debit - credit })
    } else if (r.account_type === "Liability") {
      liabilities.push({ account_id: Number(r.account_id), account_name: String(r.account_name), account_type: "Liability", net: credit - debit })
    } else {
      equity.push({ account_id: Number(r.account_id), account_name: String(r.account_name), account_type: "Equity", net: credit - debit })
    }
  }

  // Cumulative net profit from inception through asOfDate, folded into equity
  // as a computed (not posted) Retained Earnings line.
  const pnl = await getProfitAndLoss(orgId, "1900-01-01", asOfDate)

  const totalAssets = assets.reduce((s, r) => s + r.net, 0)
  const totalLiabilities = liabilities.reduce((s, r) => s + r.net, 0)
  const totalEquityPosted = equity.reduce((s, r) => s + r.net, 0)
  const retainedEarningsComputed = pnl.netProfit
  const totalEquity = totalEquityPosted + retainedEarningsComputed

  return {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquityPosted,
    retainedEarningsComputed,
    totalEquity,
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  }
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
