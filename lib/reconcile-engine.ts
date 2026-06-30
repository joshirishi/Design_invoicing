import { sql } from "@/lib/db"

// ── Auto-reconciliation engine ────────────────────────────────────────────────
// Runs after every bank statement upload.
// Two matching strategies:
//   1. Income match: bank credit ↔ unpaid invoice (amount within ₹1, date within 30 days)
//   2. Expense match: bank debit with CC payment keywords ↔ unreconciled payment record

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

// Main entry point — called after upload with the new batch ID
export async function runAutoReconcile(
  orgId: number,
  batchId: string
): Promise<{ matched: number; suggestions: ReconcileSuggestion[] }> {
  // Fetch newly uploaded transactions in this batch
  const newTxns = await sql`
    SELECT id, transaction_date, description, debit, credit, balance
    FROM bank_transactions
    WHERE org_id = ${orgId} AND upload_batch_id = ${batchId} AND reconciled = false
    ORDER BY transaction_date ASC
  `

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
      const invoices = await sql`
        SELECT id, invoice_number, total_amount, invoice_date, status
        FROM invoices
        WHERE org_id = ${orgId}
          AND status IN ('unpaid', 'partially_paid', 'overdue')
          AND total_amount BETWEEN ${credit - 1} AND ${credit + 1}
        ORDER BY invoice_date DESC
        LIMIT 10
      `

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
        const paymentRows = await sql`
          INSERT INTO payments (org_id, invoice_id, client_id, amount, payment_date, payment_method, notes, reconciled)
          SELECT ${orgId}, ${bestInvoice.id}, client_id, ${credit}, ${txDate}, 'bank_transfer',
                 'Auto-matched by reconciliation engine', true
          FROM invoices WHERE id = ${bestInvoice.id}
          RETURNING id
        `
        const paymentId = String(paymentRows[0]?.id)

        await sql`
          UPDATE bank_transactions
          SET reconciled = true, payment_id = ${paymentId}
          WHERE id = ${txId}
        `

        await sql`
          UPDATE invoices SET status = 'paid', updated_at = NOW()
          WHERE id = ${bestInvoice.id}
        `

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
        const payments = await sql`
          SELECT p.id, p.amount, p.payment_date, i.invoice_number
          FROM payments p
          LEFT JOIN invoices i ON p.invoice_id = i.id
          WHERE p.org_id = ${orgId}
            AND p.reconciled = false
            AND p.amount BETWEEN ${debit - 1} AND ${debit + 1}
          ORDER BY ABS(p.amount - ${debit}) ASC
          LIMIT 5
        `

        if (payments.length > 0) {
          const bestPayment = payments[0] as { id: string; amount: number; payment_date: string; invoice_number: string }
          const days = daysBetween(txDate, String(bestPayment.payment_date).split("T")[0])
          const conf = amountConfidence(debit, Number(bestPayment.amount)) + (days <= 2 ? 15 : days <= 7 ? 5 : 0)

          if (conf >= 70) {
            await sql`
              UPDATE bank_transactions
              SET reconciled = true, payment_id = ${bestPayment.id}
              WHERE id = ${txId}
            `
            await sql`
              UPDATE payments SET reconciled = true, updated_at = NOW()
              WHERE id = ${bestPayment.id}
            `

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

  return { matched, suggestions }
}

// Fetch unreconciled summary for notifications
export async function getUnreconciledSummary(orgId: number) {
  const [unreconciled, overdueInvoices] = await Promise.all([
    sql`
      SELECT id, transaction_date, description, credit, debit
      FROM bank_transactions
      WHERE org_id = ${orgId}
        AND reconciled = false
        AND created_at < NOW() - INTERVAL '7 days'
      ORDER BY transaction_date DESC
    `,
    sql`
      SELECT id, invoice_number, total_amount, invoice_date, client_id
      FROM invoices
      WHERE org_id = ${orgId}
        AND status IN ('unpaid', 'overdue')
        AND invoice_date + payment_due_days * INTERVAL '1 day' < NOW()
      ORDER BY invoice_date ASC
    `,
  ])

  return {
    unreconciledCount: unreconciled.length,
    unreconciledTransactions: unreconciled,
    overdueCount: overdueInvoices.length,
    overdueInvoices,
  }
}
