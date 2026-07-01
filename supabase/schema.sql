-- InvoiceFlow full schema for Supabase
-- Run this once to set up all tables

-- Organizations (one per business)
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  gstin VARCHAR(100),
  plan VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Org members / team
CREATE TABLE IF NOT EXISTS org_members (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  invited_email VARCHAR(255),
  invite_token VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org  ON org_members(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_token ON org_members(invite_token) WHERE invite_token IS NOT NULL;

-- Business profile (one per org)
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  gstin VARCHAR(100),
  pan_no VARCHAR(100),
  bank_name VARCHAR(255),
  account_name VARCHAR(255),
  account_number VARCHAR(100),
  ifsc_code VARCHAR(50),
  swift_code VARCHAR(50),
  branch VARCHAR(255),
  bank_address TEXT,
  gst_username VARCHAR(255),
  gst_api_key TEXT,
  gst_integrated BOOLEAN DEFAULT FALSE,
  gst_last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  gstin VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) NOT NULL,
  invoice_date DATE NOT NULL,
  description TEXT NOT NULL,
  hsn_code VARCHAR(50),
  service_date DATE,
  amount_before_tax DECIMAL(12, 2) NOT NULL DEFAULT 0,
  cgst_rate DECIMAL(5, 2) NOT NULL DEFAULT 9,
  sgst_rate DECIMAL(5, 2) NOT NULL DEFAULT 9,
  cgst_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  sgst_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  terms TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
  payment_due_days INTEGER NOT NULL DEFAULT 7,
  sent_at TIMESTAMP WITH TIME ZONE,
  import_source VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, invoice_number)
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(100),
  reference_number VARCHAR(255),
  notes TEXT,
  reconciled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bank transactions
CREATE TABLE IF NOT EXISTS bank_transactions (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  description TEXT,
  reference_number VARCHAR(255),
  debit DECIMAL(12, 2),
  credit DECIMAL(12, 2),
  balance DECIMAL(12, 2),
  reconciled BOOLEAN DEFAULT FALSE,
  payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
  category VARCHAR(100),
  category_source VARCHAR(50),
  upload_batch_id VARCHAR(50),
  source_format VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice line items (multi-line invoice support)
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id          SERIAL PRIMARY KEY,
  invoice_id  INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  org_id      INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  hsn_code    VARCHAR(50),
  quantity    DECIMAL(10,3) NOT NULL DEFAULT 1,
  rate        DECIMAL(12,2) NOT NULL DEFAULT 0,
  cgst_rate   DECIMAL(5,2)  NOT NULL DEFAULT 9,
  sgst_rate   DECIMAL(5,2)  NOT NULL DEFAULT 9,
  cgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  sgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  sort_order  INTEGER       NOT NULL DEFAULT 0
);

-- Purchases / input GST
CREATE TABLE IF NOT EXISTS purchases (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_name VARCHAR(255) NOT NULL,
  vendor_gstin VARCHAR(100),
  invoice_date DATE NOT NULL,
  invoice_number VARCHAR(100),
  description TEXT,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  cgst DECIMAL(12, 2) NOT NULL DEFAULT 0,
  sgst DECIMAL(12, 2) NOT NULL DEFAULT 0,
  igst DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_with_tax DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GST sync logs
CREATE TABLE IF NOT EXISTS gst_sync_logs (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  sync_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GST ledger
CREATE TABLE IF NOT EXISTS gst_ledger_entries (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  entry_type VARCHAR(50) NOT NULL,
  description TEXT,
  debit_amount DECIMAL(12, 2) DEFAULT 0,
  credit_amount DECIMAL(12, 2) DEFAULT 0,
  balance DECIMAL(12, 2) DEFAULT 0,
  transaction_id VARCHAR(255),
  gst_period VARCHAR(20),
  synced_from_gst BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_client_id          ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status             ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_org                ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id         ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_reconciled         ON payments(reconciled);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_reconciled ON bank_transactions(reconciled);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date      ON bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_gst_ledger_org              ON gst_ledger_entries(org_id);
CREATE INDEX IF NOT EXISTS idx_gst_sync_logs_org           ON gst_sync_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_purchases_org               ON purchases(org_id);

-- Seed default org + profile
INSERT INTO organizations (name) VALUES ('My Business')
  ON CONFLICT DO NOTHING;

INSERT INTO profiles (org_id, full_name, email, phone, address)
SELECT id, 'Your Name', 'you@example.com', '+91 00000 00000', 'Your Address, City, State'
FROM organizations WHERE name = 'My Business'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE org_id = organizations.id);
