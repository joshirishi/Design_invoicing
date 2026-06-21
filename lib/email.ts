/**
 * Email service using Resend.
 * Requires RESEND_API_KEY environment variable.
 */
import { Resend } from "resend"

// Lazily constructed to avoid build-time crash when RESEND_API_KEY is absent
let _resend: Resend | null = null
function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured. Add it to your environment variables.")
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

interface InvoiceEmailData {
  invoiceNumber: string
  clientName: string
  clientEmail: string
  senderName: string
  senderEmail: string
  invoiceDate: string
  totalAmount: number
  amountBeforeTax: number
  cgstAmount: number
  sgstAmount: number
  cgstRate: number
  sgstRate: number
  description: string
  hsnCode?: string
  serviceDate?: string
  terms?: string
  bankName?: string
  accountName?: string
  accountNumber?: string
  ifscCode?: string
  senderGstin?: string
  senderPan?: string
  clientGstin?: string
  invoiceUrl: string
}

function formatMoney(n: number) {
  return `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
}

function buildHtml(data: InvoiceEmailData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Invoice ${data.invoiceNumber}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f5; margin: 0; padding: 0; }
  .wrapper { max-width: 640px; margin: 0 auto; background: #fff; }
  .header { background: #1a1a2e; padding: 24px 32px; }
  .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 700; }
  .header p { color: #a3a3cc; margin: 4px 0 0; font-size: 14px; }
  .body { padding: 32px; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 24px; }
  .meta-block { font-size: 13px; color: #555; }
  .meta-block strong { display: block; font-size: 15px; color: #111; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #1a1a2e; color: #fff; text-align: left; padding: 10px 12px; font-size: 13px; }
  td { padding: 10px 12px; font-size: 13px; color: #333; border-bottom: 1px solid #e5e7eb; }
  .totals { margin-left: auto; width: 260px; font-size: 13px; }
  .totals tr td:first-child { color: #666; }
  .totals tr td:last-child { text-align: right; }
  .total-row td { font-size: 15px; font-weight: 700; border-top: 2px solid #1a1a2e; }
  .bank { font-size: 13px; color: #444; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
  .btn { display: inline-block; background: #1a1a2e; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600; margin-top: 24px; }
  .footer { background: #f4f4f5; padding: 16px 32px; font-size: 12px; color: #888; text-align: center; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>${data.senderName}</h1>
    <p>Tax Invoice · ${data.invoiceNumber}</p>
  </div>
  <div class="body">
    <p style="font-size:15px;color:#333">Dear <strong>${data.clientName}</strong>,</p>
    <p style="font-size:14px;color:#555">Please find your invoice details below. Payment is due within the agreed terms.</p>

    <div class="meta">
      <div class="meta-block"><span>Invoice Number</span><strong>${data.invoiceNumber}</strong></div>
      <div class="meta-block"><span>Invoice Date</span><strong>${formatDate(data.invoiceDate)}</strong></div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          ${data.hsnCode ? `<th>HSN/SAC</th>` : ""}
          ${data.serviceDate ? `<th>Service Date</th>` : ""}
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${data.description}</td>
          ${data.hsnCode ? `<td>${data.hsnCode}</td>` : ""}
          ${data.serviceDate ? `<td>${formatDate(data.serviceDate)}</td>` : ""}
          <td style="text-align:right">${formatMoney(data.amountBeforeTax)}</td>
        </tr>
      </tbody>
    </table>

    <table class="totals">
      <tr><td>Amount Before Tax</td><td>${formatMoney(data.amountBeforeTax)}</td></tr>
      <tr><td>CGST @ ${data.cgstRate}%</td><td>+ ${formatMoney(data.cgstAmount)}</td></tr>
      <tr><td>SGST @ ${data.sgstRate}%</td><td>+ ${formatMoney(data.sgstAmount)}</td></tr>
      <tr class="total-row"><td>Total Payable</td><td>${formatMoney(data.totalAmount)}</td></tr>
    </table>

    ${data.bankName ? `
    <div class="bank">
      <strong style="display:block;margin-bottom:8px">Bank Details</strong>
      <div>Bank: ${data.bankName}</div>
      ${data.accountName ? `<div>A/C Name: ${data.accountName}</div>` : ""}
      ${data.accountNumber ? `<div>A/C No: ${data.accountNumber}</div>` : ""}
      ${data.ifscCode ? `<div>IFSC: ${data.ifscCode}</div>` : ""}
    </div>` : ""}

    ${data.terms ? `<p style="font-size:13px;color:#777;margin-top:20px"><strong>Terms:</strong> ${data.terms}</p>` : ""}

    <a href="${data.invoiceUrl}" class="btn">View / Download Invoice</a>
  </div>
  <div class="footer">
    ${data.senderGstin ? `GSTIN: ${data.senderGstin} &nbsp;·&nbsp; ` : ""}
    This is a computer-generated invoice.
  </div>
</div>
</body>
</html>`
}

export async function sendInvoiceEmail(data: InvoiceEmailData) {
  const resend = getResend()
  const { data: result, error } = await resend.emails.send({
    from: `${data.senderName} <invoices@resend.dev>`,
    to: [data.clientEmail],
    subject: `Invoice ${data.invoiceNumber} from ${data.senderName} — ${formatMoney(data.totalAmount)}`,
    html: buildHtml(data),
  })

  if (error) throw new Error(error.message)
  return result
}
