// Tally Prime XML voucher generator.
//
// Tally's AMOUNT sign convention (critical):
//   • Debit entry  → AMOUNT is NEGATIVE  (e.g. -118000)
//   • Credit entry → AMOUNT is POSITIVE   (e.g. +100000)
//   All entries in one voucher must sum to zero.
//
// ISDEEMEDPOSITIVE:
//   "Yes" = this ledger is the primary/debit side (party in sales, bank in receipt)
//   "No"  = this ledger is the credit/income/liability side

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TallyProfile {
  company_name: string
  gstin: string | null
}

export interface TallyInvoice {
  invoice_number: string
  invoice_date: string         // YYYY-MM-DD
  client_name: string
  client_gstin: string | null
  description: string
  amount_before_tax: number
  cgst_rate: number
  sgst_rate: number
  igst_rate: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  total_amount: number
  financial_year: string | null
  place_of_supply: string | null
}

export interface TallyPurchase {
  invoice_number: string | null
  invoice_date: string
  vendor_name: string
  vendor_gstin: string | null
  description: string | null
  amount: number
  cgst: number
  sgst: number
  igst: number
  total_with_tax: number
}

export interface TallyPayment {
  payment_date: string
  reference_number: string | null
  payment_method: string | null
  amount: number
  tds_amount: number
  client_name: string
  invoice_number: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Tally requires YYYYMMDD date format
function tallyDate(dateStr: string): string {
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}${m}${day}`
}

// Format amount: 2 decimal places, no sign (sign comes from the field value)
function amt(n: number): string {
  return Math.abs(n).toFixed(2)
}

// Escape XML special characters in text content
function esc(s: string | null | undefined): string {
  if (!s) return ""
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

// One <ALLLEDGERENTRIES.LIST> block
function ledgerEntry(
  ledger: string,
  amount: number,        // positive = credit, negative = debit
  isDeemedPositive = false,
): string {
  return `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${esc(ledger)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>${isDeemedPositive ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
          <AMOUNT>${amount < 0 ? "-" : ""}${amt(amount)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`
}

// ─── Sales Vouchers (from invoices) ──────────────────────────────────────────

function salesVoucher(inv: TallyInvoice): string {
  const isIgst = inv.igst_amount > 0

  // Party (Sundry Debtors) → Debit → NEGATIVE amount, ISDEEMEDPOSITIVE = Yes
  // Income + Tax entries   → Credit → POSITIVE amounts, ISDEEMEDPOSITIVE = No
  // All must sum to zero: -total + base + cgst + sgst + igst = 0

  const entries: string[] = [
    ledgerEntry("Sundry Debtors", -inv.total_amount, true),
    ledgerEntry("Service Income", inv.amount_before_tax, false),
  ]

  if (isIgst) {
    if (inv.igst_amount > 0) entries.push(ledgerEntry("Output IGST", inv.igst_amount, false))
  } else {
    if (inv.cgst_amount > 0) entries.push(ledgerEntry("Output CGST", inv.cgst_amount, false))
    if (inv.sgst_amount > 0) entries.push(ledgerEntry("Output SGST", inv.sgst_amount, false))
  }

  return `
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <VOUCHER VCHTYPE="Sales" ACTION="Create">
          <DATE>${tallyDate(inv.invoice_date)}</DATE>
          <VOUCHERNUMBER>${esc(inv.invoice_number)}</VOUCHERNUMBER>
          <PARTYLEDGERNAME>${esc(inv.client_name)}</PARTYLEDGERNAME>
          <ISINVOICE>Yes</ISINVOICE>
          <NARRATION>${esc(inv.description)}</NARRATION>
          ${inv.client_gstin ? `<PARTYGSTIN>${esc(inv.client_gstin)}</PARTYGSTIN>` : ""}
          ${inv.place_of_supply ? `<PLACEOFSUPPLY>${esc(inv.place_of_supply)}</PLACEOFSUPPLY>` : ""}
          ${entries.join("")}
        </VOUCHER>
      </TALLYMESSAGE>`
}

// ─── Purchase Vouchers (from purchases) ──────────────────────────────────────

function purchaseVoucher(p: TallyPurchase): string {
  // Sundry Creditors → Credit → POSITIVE, ISDEEMEDPOSITIVE = Yes (party side)
  // Purchases + Input Tax → Debit → NEGATIVE amounts

  const entries: string[] = [
    ledgerEntry("Sundry Creditors", p.total_with_tax, true),
    ledgerEntry("Direct Purchases", -p.amount, false),
  ]

  if (p.igst > 0) {
    entries.push(ledgerEntry("Input IGST (ITC)", -p.igst, false))
  } else {
    if (p.cgst > 0) entries.push(ledgerEntry("Input CGST (ITC)", -p.cgst, false))
    if (p.sgst > 0) entries.push(ledgerEntry("Input SGST (ITC)", -p.sgst, false))
  }

  const invRef = p.invoice_number ? `Inv# ${p.invoice_number} · ` : ""
  const narration = `${invRef}${p.description || p.vendor_name}`

  return `
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <VOUCHER VCHTYPE="Purchase" ACTION="Create">
          <DATE>${tallyDate(p.invoice_date)}</DATE>
          ${p.invoice_number ? `<VOUCHERNUMBER>${esc(p.invoice_number)}</VOUCHERNUMBER>` : ""}
          <PARTYLEDGERNAME>${esc(p.vendor_name)}</PARTYLEDGERNAME>
          <ISINVOICE>Yes</ISINVOICE>
          <NARRATION>${esc(narration)}</NARRATION>
          ${p.vendor_gstin ? `<PARTYGSTIN>${esc(p.vendor_gstin)}</PARTYGSTIN>` : ""}
          ${entries.join("")}
        </VOUCHER>
      </TALLYMESSAGE>`
}

// ─── Receipt Vouchers (from payments) ────────────────────────────────────────

function receiptVoucher(pay: TallyPayment): string {
  // Bank Account  → Debit  → NEGATIVE, ISDEEMEDPOSITIVE = Yes
  // TDS Receivable → Debit → NEGATIVE (if TDS deducted)
  // Sundry Debtors → Credit → POSITIVE

  const bankLedger = pay.payment_method?.toLowerCase().includes("cash")
    ? "Cash in Hand"
    : "Bank Account"

  const netBankAmount = pay.amount - (pay.tds_amount || 0)
  const totalCredit = pay.amount  // full invoice settlement

  const entries: string[] = []
  entries.push(ledgerEntry(bankLedger, -netBankAmount, true))
  if ((pay.tds_amount || 0) > 0) {
    entries.push(ledgerEntry("TDS Receivable", -pay.tds_amount, false))
  }
  entries.push(ledgerEntry("Sundry Debtors", totalCredit, false))

  const narration = pay.invoice_number
    ? `Payment received against ${pay.invoice_number}${pay.reference_number ? ` · Ref: ${pay.reference_number}` : ""}`
    : `Payment from ${pay.client_name}${pay.reference_number ? ` · Ref: ${pay.reference_number}` : ""}`

  return `
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <VOUCHER VCHTYPE="Receipt" ACTION="Create">
          <DATE>${tallyDate(pay.payment_date)}</DATE>
          <PARTYLEDGERNAME>${esc(pay.client_name)}</PARTYLEDGERNAME>
          <NARRATION>${esc(narration)}</NARRATION>
          ${entries.join("")}
        </VOUCHER>
      </TALLYMESSAGE>`
}

// ─── Main export function ─────────────────────────────────────────────────────

export interface TallyExportInput {
  profile: TallyProfile
  invoices: TallyInvoice[]
  purchases: TallyPurchase[]
  payments: TallyPayment[]
  financialYear: string
  voucherTypes: ("sales" | "purchases" | "receipts")[]
}

export function generateTallyXML(input: TallyExportInput): string {
  const { profile, invoices, purchases, payments, voucherTypes } = input

  const messages: string[] = []

  if (voucherTypes.includes("sales")) {
    messages.push(...invoices.map(salesVoucher))
  }
  if (voucherTypes.includes("purchases")) {
    messages.push(...purchases.map(purchaseVoucher))
  }
  if (voucherTypes.includes("receipts")) {
    messages.push(...payments.map(receiptVoucher))
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${esc(profile.company_name)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        ${messages.join("\n")}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`
}

// ─── Summary for UI display ───────────────────────────────────────────────────

export interface TallyExportSummary {
  salesCount: number
  salesTotal: number
  purchasesCount: number
  purchasesTotal: number
  receiptsCount: number
  receiptsTotal: number
  totalVouchers: number
}

export function getExportSummary(
  invoices: TallyInvoice[],
  purchases: TallyPurchase[],
  payments: TallyPayment[],
  types: ("sales" | "purchases" | "receipts")[],
): TallyExportSummary {
  const salesCount    = types.includes("sales")     ? invoices.length  : 0
  const purchasesCount = types.includes("purchases") ? purchases.length : 0
  const receiptsCount  = types.includes("receipts")  ? payments.length  : 0

  return {
    salesCount,
    salesTotal:     invoices.reduce((s, i) => s + i.total_amount, 0),
    purchasesCount,
    purchasesTotal: purchases.reduce((s, p) => s + p.total_with_tax, 0),
    receiptsCount,
    receiptsTotal:  payments.reduce((s, p) => s + p.amount, 0),
    totalVouchers:  salesCount + purchasesCount + receiptsCount,
  }
}
