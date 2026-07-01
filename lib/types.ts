export interface Profile {
  id: string
  org_id: number
  full_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  gstin: string | null
  pan_no: string | null
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
  cgst_amount: number
  sgst_amount: number
  total_amount: number
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
  cgst_amount: number
  sgst_amount: number
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
  upload_batch_id: string | null
  source_format: string | null
  created_at: string
  payment?: Partial<Payment>
}

export interface Purchase {
  id: string
  org_id: number
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
  created_at: string
  updated_at: string
}

export interface Organization {
  id: number
  name: string
  gstin: string | null
  plan: string
  created_at: string
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
