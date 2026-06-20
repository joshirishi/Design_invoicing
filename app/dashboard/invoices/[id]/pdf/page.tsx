import { notFound } from "next/navigation"
import { sql } from "@/lib/db"
import { numberToWords } from "@/lib/utils/number-to-words"
import { PrintButton } from "./print-button"

export default async function InvoicePdfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const invoices = await sql`
    SELECT i.*,
      json_build_object(
        'id', c.id, 'name', c.name, 'email', c.email,
        'address', c.address, 'gstin', c.gstin
      ) as client
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.id = ${id}
  `

  const invoice = invoices[0]
  if (!invoice) notFound()

  const profiles = await sql`SELECT * FROM profiles LIMIT 1`
  const profile = profiles[0] || null

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
  const fmtMoney = (n: number) => `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`

  return (
    <>
      {/* Print-trigger styles — hidden from print */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .invoice-page { box-shadow: none !important; }
        }
      `}</style>

      {/* Top bar with print button */}
      <div className="no-print bg-gray-100 px-6 py-3 flex items-center justify-between border-b">
        <p className="text-sm text-gray-600">Invoice preview — click Print / Save as PDF</p>
        <PrintButton />
      </div>

      {/* A4 invoice */}
      <div className="invoice-page bg-white mx-auto my-8 shadow-xl" style={{ width: "210mm", minHeight: "297mm", padding: "20mm" }}>

        {/* ── Header ── */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wide text-gray-900">
              {profile?.full_name || "Your Name"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Multi Disciplinary Designer &amp; Consultant</p>
            {profile?.email && <p className="text-sm text-gray-700 mt-2">{profile.email}</p>}
            {profile?.phone && <p className="text-sm text-gray-700">{profile.phone}</p>}
            {profile?.address && <p className="text-sm text-gray-700 whitespace-pre-line">{profile.address}</p>}
            {profile?.gstin && <p className="text-sm text-gray-700 mt-1">GSTIN: {profile.gstin}</p>}
          </div>
          <div className="text-right">
            <div className="inline-block border border-gray-800 px-4 py-1 mb-3">
              <span className="text-lg font-bold tracking-widest text-gray-800">TAX INVOICE</span>
            </div>
            <p className="text-sm text-gray-600">Date: {fmtDate(invoice.invoice_date)}</p>
            <p className="text-sm font-semibold text-gray-800 mt-1">#{invoice.invoice_number}</p>
          </div>
        </div>

        {/* ── Bill To ── */}
        <div className="mb-8 border border-gray-200 rounded p-4 bg-gray-50">
          <p className="text-xs font-semibold uppercase text-gray-400 mb-1">Bill To</p>
          <p className="font-semibold text-gray-900">{invoice.client?.name}</p>
          {invoice.client?.address && (
            <p className="text-sm text-gray-700 whitespace-pre-line">{invoice.client.address}</p>
          )}
          {invoice.client?.gstin && (
            <p className="text-sm text-gray-700 mt-1">GSTIN: {invoice.client.gstin}</p>
          )}
        </div>

        {/* ── Line items table ── */}
        <table className="w-full mb-6 text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#1a1a1a", color: "#fff" }}>
              <th className="text-left p-3 font-semibold">No</th>
              <th className="text-left p-3 font-semibold">Description</th>
              <th className="text-center p-3 font-semibold">HSN / SAC</th>
              <th className="text-center p-3 font-semibold">Service Date</th>
              <th className="text-right p-3 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td className="p-3 text-gray-700 align-top">1</td>
              <td className="p-3 text-gray-700 align-top">{invoice.description}</td>
              <td className="p-3 text-gray-700 align-top text-center">{invoice.hsn_code || "—"}</td>
              <td className="p-3 text-gray-700 align-top text-center">
                {invoice.service_date ? fmtDate(invoice.service_date) : "—"}
              </td>
              <td className="p-3 text-gray-900 font-medium align-top text-right">
                {fmtMoney(invoice.amount_before_tax)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Totals ── */}
        <div className="flex justify-end mb-8">
          <div className="w-80 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Amount Before Tax</span>
              <span>{fmtMoney(invoice.amount_before_tax)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>CGST @ {invoice.cgst_rate}%</span>
              <span>+ {fmtMoney(invoice.cgst_amount)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>SGST @ {invoice.sgst_rate}%</span>
              <span>+ {fmtMoney(invoice.sgst_amount)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-800 pt-2 mt-1 text-base">
              <span>Total Payable</span>
              <span>{fmtMoney(invoice.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* ── Amount in words ── */}
        <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-8 text-sm">
          <span className="font-semibold text-gray-700">Total in Words: </span>
          <span className="text-gray-800 italic">{numberToWords(Number(invoice.total_amount))}</span>
        </div>

        {/* ── Bank + Tax details ── */}
        {profile && (
          <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
            <div>
              <p className="font-semibold text-gray-800 mb-2 border-b pb-1">Bank Details</p>
              <p className="text-gray-700">Bank: {profile.bank_name || "—"}</p>
              <p className="text-gray-700">A/C Name: {profile.account_name || "—"}</p>
              <p className="text-gray-700">A/C No: {profile.account_number || "—"}</p>
              <p className="text-gray-700">IFSC: {profile.ifsc_code || "—"}</p>
              {profile.swift_code && <p className="text-gray-700">Swift: {profile.swift_code}</p>}
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-2 border-b pb-1">Tax Details</p>
              {profile.pan_no && <p className="text-gray-700">PAN: {profile.pan_no}</p>}
              {profile.gstin && <p className="text-gray-700">GSTIN: {profile.gstin}</p>}
            </div>
          </div>
        )}

        {/* ── Terms ── */}
        {invoice.terms && (
          <div className="mb-8 text-sm">
            <p className="font-semibold text-gray-800 mb-1">Terms &amp; Conditions</p>
            <p className="text-gray-600 leading-relaxed">{invoice.terms}</p>
          </div>
        )}

        {/* ── Signature ── */}
        <div className="flex justify-end mt-12">
          <div className="text-center text-sm">
            <div className="border-t border-gray-400 pt-2 w-48">
              <p className="text-gray-600">Authorised Signatory</p>
              <p className="font-semibold text-gray-800">{profile?.full_name || "Your Name"}</p>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-gray-200 mt-10 pt-4 text-center text-xs text-gray-400">
          This is a computer-generated invoice and does not require a physical signature.
        </div>
      </div>
    </>
  )
}
