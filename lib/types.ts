export interface Profile {
  id: string
  org_id: number
  full_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  gstin: string | null
  pan_no: string | null
  state_code: string | null   // your business state, used to determine IGST vs CGST+SGST
  bank_name: string | null
  account_name: string | null
  account_number: string | null
  ifsc_code: string | null
  swift_code: string | null
  branch: string | null
  bank_address: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  org_id: number
  name: string
  email: string | null
  phone: string | null
  address: string | null
  gstin: string | null
  state_code: string | null   // 2-digit Indian state code e.g. "27" for Maharashtra
  pan_no: string | null
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  org_id: number
  client_id: string
  invoice_number: string
  invoice_date: string
  description: string
  hsn_code: string | null
  service_date: string | null
  amount_before_tax: number
  cgst_rate: number
  sgst_rate: number
  igst_rate: number           // 0 for intra-state, full rate for inter-state
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  total_amount: number
  financial_year: string | null  // e.g. "2025-26" (Apr–Mar)
  place_of_supply: string | null // 2-digit state code
  terms: string | null
  status: "paid" | "unpaid" | "partially_paid" | "overdue"
  payment_due_days: number
  sent_at: string | null
  import_source: string | null
  created_at: string
  updated_at: string
  client?: Client
}

export interface InvoiceLineItem {
  id?: string
  invoice_id?: string
  org_id?: number
  description: string
  hsn_code: string | null
  quantity: number
  rate: number
  cgst_rate: number
  sgst_rate: number
  igst_rate: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  amount: number        // rate × quantity (before tax)
  sort_order?: number
}

export interface Payment {
  id: string
  org_id: number
  invoice_id: string | null
  client_id: string | null
  amount: number
  payment_date: string
  payment_method: string | null
  reference_number: string | null
  notes: string | null
  reconciled: boolean
  tds_amount: number          // TDS deducted by client (reduces net receivable)
  tds_section: string | null  // e.g. "194J", "194C"
  created_at: string
  updated_at: string
  invoice?: Partial<Invoice>
  client?: Partial<Client>
}

export interface BankTransaction {
  id: string
  org_id: number
  transaction_date: string
  description: string | null
  reference_number: string | null
  debit: number | null
  credit: number | null
  balance: number | null
  reconciled: boolean
  payment_id: string | null
  category: string | null
  category_source: string | null
  ledger_id: number | null        // FK to chart_of_accounts
  upload_batch_id: string | null
  source_format: string | null
  created_at: string
  payment?: Partial<Payment>
  ledger?: Partial<ChartOfAccount>
}

export interface Purchase {
  id: string
  org_id: number
  vendor_id: number | null       // FK to vendors master
  vendor_name: string
  vendor_gstin: string | null
  invoice_date: string
  invoice_number: string | null
  description: string | null
  amount: number
  cgst: number
  sgst: number
  igst: number
  total_with_tax: number
  financial_year: string | null
  created_at: string
  updated_at: string
  vendor?: Partial<Vendor>
}

export interface Organization {
  id: number
  name: string
  gstin: string | null
  plan: string
  created_at: string
}

export interface ChartOfAccount {
  id: number
  org_id: number | null       // null = system default visible to all orgs
  name: string
  type: "Asset" | "Liability" | "Income" | "Expense" | "Equity"
  tally_group: string         // Tally primary group — used in XML export
  tally_parent: string | null // Tally parent group (for nested groups)
  is_system: boolean          // system defaults cannot be deleted
  is_active: boolean
  parent_id: number | null
  created_at: string
  updated_at: string
}

export interface Vendor {
  id: number
  org_id: number
  name: string
  gstin: string | null
  pan_no: string | null
  state_code: string | null
  address: string | null
  email: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface OrgMember {
  id: string
  org_id: number
  user_id: string | null
  role: string
  invited_email: string | null
  invite_token: string | null
  status: string
  created_at: string
}
