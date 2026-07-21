// Parses a GSTR-2B JSON download (from gst.gov.in → Returns → GSTR-2B → Download JSON)
// into supplier-wise ITC line items, for reconciliation against logged Purchases.
//
// NOT verified against a real GSTR-2B download — unlike the Zerodha Tax P&L and
// PhonePe parsers elsewhere in this codebase, no sample file was available. This
// follows the documented GSTN API schema (docdata.b2b[].ctin/.trdnm/.inv[].inum/
// .idt/.val/.itms[].itm_det.txval/.camt/.samt/.iamt), which is stable and widely
// referenced, but treat this as unverified: if it returns zero entries, the raw
// file is still preserved via the existing GST Document Checklist upload for
// manual reference — nothing is silently lost.

export interface ParsedGstr2bEntry {
  supplier_gstin: string
  supplier_name: string | null
  invoice_number: string | null
  invoice_date: string | null // YYYY-MM-DD
  taxable_value: number
  cgst: number
  sgst: number
  igst: number
  itc_available: boolean
}

// GSTR-2B dates are DD-MM-YYYY
function parseGstr2bDate(d: string | undefined): string | null {
  if (!d) return null
  const m = d.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

interface Gstr2bItem {
  itm_det?: { txval?: number; camt?: number; samt?: number; iamt?: number }
}
interface Gstr2bInvoice {
  inum?: string
  idt?: string
  itcavl?: string // "Y" | "N"
  itms?: Gstr2bItem[]
}
interface Gstr2bSupplier {
  ctin?: string
  trdnm?: string
  inv?: Gstr2bInvoice[]
}
interface Gstr2bJson {
  docdata?: { b2b?: Gstr2bSupplier[] }
}

export function parseGstr2bJson(text: string): { entries: ParsedGstr2bEntry[]; period: string | null } {
  let json: Gstr2bJson & { fp?: string }
  try {
    json = JSON.parse(text)
  } catch {
    return { entries: [], period: null }
  }

  const suppliers = json?.docdata?.b2b
  if (!Array.isArray(suppliers)) return { entries: [], period: json?.fp || null }

  const entries: ParsedGstr2bEntry[] = []

  for (const supplier of suppliers) {
    const gstin = supplier.ctin
    if (!gstin) continue
    const invoices = Array.isArray(supplier.inv) ? supplier.inv : []

    for (const inv of invoices) {
      const items = Array.isArray(inv.itms) ? inv.itms : []
      const taxable_value = items.reduce((s, it) => s + Number(it.itm_det?.txval || 0), 0)
      const cgst = items.reduce((s, it) => s + Number(it.itm_det?.camt || 0), 0)
      const sgst = items.reduce((s, it) => s + Number(it.itm_det?.samt || 0), 0)
      const igst = items.reduce((s, it) => s + Number(it.itm_det?.iamt || 0), 0)

      if (taxable_value === 0 && cgst === 0 && sgst === 0 && igst === 0) continue

      entries.push({
        supplier_gstin: gstin,
        supplier_name: supplier.trdnm || null,
        invoice_number: inv.inum || null,
        invoice_date: parseGstr2bDate(inv.idt),
        taxable_value,
        cgst,
        sgst,
        igst,
        itc_available: inv.itcavl !== "N",
      })
    }
  }

  return { entries, period: json.fp || null }
}
