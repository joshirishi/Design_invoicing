export interface Profile {
  id: string
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
  user_id: string
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
  user_id: string
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
  created_at: string
  updated_at: string
  client?: Client
}

export interface Payment {
  id: string
  user_id: string
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
}

export interface BankTransaction {
  id: string
  user_id: string
  transaction_date: string
  description: string | null
  reference_number: string | null
  debit: number | null
  credit: number | null
  balance: number | null
  reconciled: boolean
  payment_id: string | null
  created_at: string
}
