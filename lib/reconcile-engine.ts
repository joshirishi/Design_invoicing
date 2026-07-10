import { sql, rawSql } from "@/lib/db"
import { normalizeForMatch, extractSignal } from "@/lib/parsers/bank-signal"

// ── Auto-reconciliation engine ────────────────────────────────────────────────
// Runs after every bank statement upload.
// Three strategies, in order:
//   1. Income match: bank credit ↔ unpaid invoice (amount within ₹1, date within 30 days)
//   2. Expense match: bank debit with CC payment keywords ↔ unreconciled payment record
//   3. For anything still unmatched but categorized to a revenue/expense-like account,
//      generate an editable "suggestion" (new invoice/purchase) for human review — see
//      generateReconciliationSuggestions() below.
//
// IMPORTANT: every query below is written so the SQL text starts immediately after the
// opening backtick (no leading newline). The exec_sql RPC silently drops SELECT/RETURNING
// output — while still executing the write — when the query string starts with a newline.
// Internal line breaks later in the string are fine; only the leading newline matters.

export interface ReconcileSuggestion {
  bankTxId: string
  matchType: "income" | "expense"
  invoiceId?: string
  paymentId?: string
  confidence: number   // 0–100
  reason: string
}

// CC payment keywords found in bank statement debit descriptions
const CC_PAYMENT_KEYWORDS = [
  "infinity payment",
  "icici cc",
  "credit card payment",
  "cc payment",
  "creditcard",
]

// Income accounts whose tally_group marks them as genuine sales (invoice-worthy).
// Interest Received, Discount Received, Other Income, Refund/Reversal are excluded —
// they're real money in, but not the kind of thing you invoice a client for.
const INVOICE_ELIGIBLE_TALLY_GROUP = "Sales Accounts"

// Expense accounts that are real money out but not a "vendor purchase" worth a
// GST-tracked purchase record (payroll, bank fees, depreciation, personal drawings).
const PURCHASE_EXCLUDED_ACCOUNTS = new Set([
  "Bank Charges", "Depreciation", "Salary & Wages", "Discount Allowed",
  "Personal Expenses", "Food & Dining", "Groceries", "Medical & Health",
  "Shopping & Retail", "Entertainment", "Education", "Household & Personal Care",
])

function daysBetween(a: string, b: string): number {
  const diff = Math.abs(new Date(a).getTime() - new Date(b).getTime())
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function amountConfidence(bankAmt: number, matchAmt: number): number {
  const diff = Math.abs(bankAmt - matchAmt)
  if (diff === 0) return 100
  if (diff <= 1) return 98
  if (diff <= 10) return 90
  const pct = diff / bankAmt
  if (pct <= 0.01) return 85
  if (pct <= 0.05) return 70
  return 0
}

// Fuzzy-matches a bank description against a list of known client/vendor names.
// Tries a full normalized substring match first, then falls back to matching any
// single significant (4+ char) word from the candidate name inside the description.
function fuzzyMatchName<T extends { id: number; name: string }>(description: string, candidates: T[]): T | null {
  const normDesc = normalizeForMatch(description)
  let best: { candidate: T; score: number } | null = null

  for (const c of candidates) {
    const normName = normalizeForMatch(c.name)
    if (!normName || normName.length < 3) continue

    if (normDesc.includes(normName)) {
      const score = normName.length + 100 // full-name matches always outrank token matches
      if (!best || score > best.score) best = { candidate: c, score }
      continue
    }

    const tokens = normName.split(" ").filter((t) => t.length >= 4)
    const matchedLength = tokens.filter((t) => normDesc.includes(t)).reduce((s, t) => s + t.length, 0)
    if (matchedLength > 0 && (!best || matchedLength > best.score)) {
      best = { candidate: c, score: matchedLength }
    }
  }

  return best?.candidate ?? null
}

// Main entry point — called after upload with the new batch ID
export async function runAutoReconcile(
  orgId: number,
  batchId: string
): Promise<{ matched: number; suggestions: ReconcileSuggestion[]; suggestionsCreated: number }> {
  const newTxns = await sql`SELECT id, transaction_date, description, debit, credit, balance
    FROM bank_transactions
    WHERE org_id = ${orgId} AND upload_batch_id = ${batchId} AND reconciled = false
    ORDER BY transaction_date ASC`

  const suggestions: ReconcileSuggestion[] = []
  let matched = 0

  for (const txn of newTxns) {
    const txId = String(txn.id)
    const txDate = String(txn.transaction_date).split("T")[0]
    const credit = txn.credit ? Number(txn.credit) : null
    const debit  = txn.debit  ? Number(txn.debit)  : null
    const desc   = String(txn.description ?? "").toLowerCase()

    // ── Income matching: bank credit → unpaid invoice ──────────────────────
    if (credit && credit > 0) {
      const invoices = await sql`SELECT id, invoice_number, total_amount, invoice_date, status
        FROM invoices
        WHERE org_id = ${orgId}
          AND status IN ('unpaid', 'partially_paid', 'overdue')
          AND total_amount BETWEEN ${credit - 1} AND ${credit + 1}
        ORDER BY invoice_date DESC
        LIMIT 10`

      let bestInvoice: { id: string; invoice_number: string; total_amount: number; invoice_date: string } | null = null
      let bestScore = 0

      for (const inv of invoices) {
        const invDate = String(inv.invoice_date).split("T")[0]
        const days = daysBetween(txDate, invDate)
        const amtScore = amountConfidence(credit, Number(inv.total_amount))
        // Date proximity bonus: within 7 days = full bonus, within 30 = partial
        const dateScore = days <= 7 ? 20 : days <= 30 ? 10 : 0
        const score = amtScore + dateScore

        if (score > bestScore && amtScore > 0) {
          bestScore = score
          bestInvoice = inv as { id: string; invoice_number: string; total_amount: number; invoice_date: string }
        }
      }

      if (bestInvoice && bestScore >= 70) {
        // Create a payment record and reconcile automatically
        const paymentRows = await sql`INSERT INTO payments (org_id, invoice_id, client_id, amount, payment_date, payment_method, notes, reconciled)
          SELECT ${orgId}, ${bestInvoice.id}, client_id, ${credit}, ${txDate}, 'bank_transfer',
                 'Auto-matched by reconciliation engine', true
          FROM invoices WHERE id = ${bestInvoice.id}
          RETURNING id`
        const paymentId = String(paymentRows[0]?.id)

        await sql`UPDATE bank_transactions
          SET reconciled = true, payment_id = ${paymentId}
          WHERE id = ${txId}`

        await sql`UPDATE invoices SET status = 'paid', updated_at = NOW()
          WHERE id = ${bestInvoice.id}`

        suggestions.push({
          bankTxId: txId,
          matchType: "income",
          invoiceId: bestInvoice.id,
          paymentId,
          confidence: bestScore,
          reason: `Matched ₹${credit.toLocaleString("en-IN")} credit to Invoice ${bestInvoice.invoice_number}`,
        })
        matched++
        continue
      }
    }

    // ── Expense matching: CC payment debit → payments table ────────────────
    if (debit && debit > 0) {
      const isCCPayment = CC_PAYMENT_KEYWORDS.some((kw) => desc.includes(kw))

      if (isCCPayment) {
        const payments = await sql`SELECT p.id, p.amount, p.payment_date, i.invoice_number
          FROM payments p
          LEFT JOIN invoices i ON p.invoice_id = i.id
          WHERE p.org_id = ${orgId}
            AND p.reconciled = false
            AND p.amount BETWEEN ${debit - 1} AND ${debit + 1}
          ORDER BY ABS(p.amount - ${debit}) ASC
          LIMIT 5`

        if (payments.length > 0) {
          const bestPayment = payments[0] as { id: string; amount: number; payment_date: string; invoice_number: string }
          const days = daysBetween(txDate, String(bestPayment.payment_date).split("T")[0])
          const conf = amountConfidence(debit, Number(bestPayment.amount)) + (days <= 2 ? 15 : days <= 7 ? 5 : 0)

          if (conf >= 70) {
            await sql`UPDATE bank_transactions
              SET reconciled = true, payment_id = ${bestPayment.id}
              WHERE id = ${txId}`
            await sql`UPDATE payments SET reconciled = true, updated_at = NOW()
              WHERE id = ${bestPayment.id}`

            suggestions.push({
              bankTxId: txId,
              matchType: "expense",
              paymentId: bestPayment.id,
              confidence: conf,
              reason: `CC payment of ₹${debit.toLocaleString("en-IN")} matched to payment record`,
            })
            matched++
          }
        }
      }
    }
  }

  // Anything still unmatched in this batch but categorized to a revenue/expense
  // account becomes an editable suggestion instead of just sitting unreconciled.
  const { created: suggestionsCreated } = await generateReconciliationSuggestions(orgId, batchId)

  return { matched, suggestions, suggestionsCreated }
}

// ── Suggestion generation (Phase 4) ─────────────────────────────────────────
// For bank transactions that are (a) unreconciled, (b) categorized to a chart_of_accounts
// leaf, and (c) that leaf is revenue-like (credit) or a real vendor expense (debit),
// propose a new invoice/purchase row for human review — never writes the invoice/
// purchase directly. Idempotent: ON CONFLICT DO NOTHING against the unique index on
// bank_transaction_id, so it's safe to call repeatedly (post-upload, and from backfill).
export async function generateReconciliationSuggestions(
  orgId: number,
  batchId?: string,
): Promise<{ created: number; skipped: number }> {
  const scopeClause = batchId
    ? `bt.org_id = ${orgId} AND bt.upload_batch_id = '${batchId.replace(/'/g, "''")}'`
    : `bt.org_id = ${orgId}`

  // Single-line — JOINs silently return empty via the exec_sql RPC when multi-line.
  const candidates = await rawSql(`SELECT bt.id, bt.transaction_date, bt.description, bt.debit, bt.credit, bt.ledger_id, ca.name AS account_name, ca.type AS account_type, ca.tally_group FROM bank_transactions bt JOIN chart_of_accounts ca ON bt.ledger_id = ca.id LEFT JOIN reconciliation_suggestions rs ON rs.bank_transaction_id = bt.id WHERE ${scopeClause} AND bt.reconciled = false AND bt.ledger_id IS NOT NULL AND rs.id IS NULL`)

  if (candidates.length === 0) return { created: 0, skipped: 0 }

  const [clients, vendors] = await Promise.all([
    sql`SELECT id, name, gstin, state_code FROM clients WHERE org_id = ${orgId}`,
    sql`SELECT id, name, gstin, state_code FROM vendors WHERE org_id = ${orgId}`,
  ])

  let created = 0
  let skipped = 0

  for (const row of candidates as Record<string, unknown>[]) {
    const id = Number(row.id)
    const description = String(row.description ?? "")
    const txDate = String(row.transaction_date).split("T")[0]
    const credit = row.credit != null ? Number(row.credit) : null
    const debit = row.debit != null ? Number(row.debit) : null
    const accountName = String(row.account_name)
    const accountType = String(row.account_type)
    const tallyGroup = String(row.tally_group)
    const chartAccountId = Number(row.ledger_id)
    const { signal } = extractSignal(description)

    if (credit && credit > 0 && accountType === "Income" && tallyGroup === INVOICE_ELIGIBLE_TALLY_GROUP) {
      const client = fuzzyMatchName(description, clients as { id: number; name: string; gstin: string | null }[])
      const payload = {
        client_id: client?.id ?? null,
        client_name: client?.name ?? signal,
        client_gstin: client?.gstin ?? "",
        invoice_date: txDate,
        description: `${accountName} — ${signal}`,
        amount_before_tax: credit,
        cgst_rate: 0, sgst_rate: 0, igst_rate: 0,
        cgst_amount: 0, sgst_amount: 0, igst_amount: 0,
        total_amount: credit,
        status: "unpaid",
        import_source: "bank_reconciliation",
      }
      const confidence = client ? 75 : 45

      const inserted = await rawSql(`INSERT INTO reconciliation_suggestions (org_id, bank_transaction_id, suggestion_type, chart_account_id, suggested_payload, confidence, status) VALUES (${orgId}, ${id}, 'invoice', ${chartAccountId}, '${JSON.stringify(payload).replace(/'/g, "''")}'::jsonb, ${confidence}, 'pending') ON CONFLICT (bank_transaction_id) DO NOTHING RETURNING id`)
      inserted.length > 0 ? created++ : skipped++
      continue
    }

    if (debit && debit > 0 && accountType === "Expense" && !PURCHASE_EXCLUDED_ACCOUNTS.has(accountName)) {
      const vendor = fuzzyMatchName(description, vendors as { id: number; name: string; gstin: string | null; state_code: string | null }[])
      const payload = {
        vendor_id: vendor?.id ?? null,
        vendor_name: vendor?.name ?? signal,
        vendor_gstin: vendor?.gstin ?? "",
        invoice_date: txDate,
        invoice_number: "",
        description: `${accountName} — ${signal}`,
        amount: debit,
        cgst: 0, sgst: 0, igst: 0,
      }
      const confidence = vendor ? 75 : 45

      const inserted = await rawSql(`INSERT INTO reconciliation_suggestions (org_id, bank_transaction_id, suggestion_type, chart_account_id, suggested_payload, confidence, status) VALUES (${orgId}, ${id}, 'purchase', ${chartAccountId}, '${JSON.stringify(payload).replace(/'/g, "''")}'::jsonb, ${confidence}, 'pending') ON CONFLICT (bank_transaction_id) DO NOTHING RETURNING id`)
      inserted.length > 0 ? created++ : skipped++
      continue
    }

    skipped++
  }

  return { created, skipped }
}

// Fetch unreconciled summary for notifications
export async function getUnreconciledSummary(orgId: number) {
  const [unreconciled, overdueInvoices] = await Promise.all([
    sql`SELECT id, transaction_date, description, credit, debit
      FROM bank_transactions
      WHERE org_id = ${orgId}
        AND reconciled = false
        AND created_at < NOW() - INTERVAL '7 days'
      ORDER BY transaction_date DESC`,
    sql`SELECT id, invoice_number, total_amount, invoice_date, client_id
      FROM invoices
      WHERE org_id = ${orgId}
        AND status IN ('unpaid', 'overdue')
        AND invoice_date + payment_due_days * INTERVAL '1 day' < NOW()
      ORDER BY invoice_date ASC`,
  ])

  return {
    unreconciledCount: unreconciled.length,
    unreconciledTransactions: unreconciled,
    overdueCount: overdueInvoices.length,
    overdueInvoices,
  }
}
