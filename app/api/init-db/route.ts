import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

// Creates the canonical schema matching lib/types.ts.
// Safe to re-run — uses DROP IF EXISTS + CREATE IF NOT EXISTS.
export async function GET() {
  try {
    // If org already exists, schema is set up — just return the org id
    const existing = await sql`SELECT id FROM organizations LIMIT 1`
    if (existing.length > 0) {
      return NextResponse.json({ success: true, message: "Database already initialised", org_id: existing[0].id })
    }

    await sql`DROP TABLE IF EXISTS gst_ledger_entries CASCADE`
    await sql`DROP TABLE IF EXISTS gst_sync_logs CASCADE`
    await sql`DROP TABLE IF EXISTS purchases CASCADE`
    await sql`DROP TABLE IF EXISTS bank_transactions CASCADE`
    await sql`DROP TABLE IF EXISTS payments CASCADE`
    await sql`DROP TABLE IF EXISTS invoices CASCADE`
    await sql`DROP TABLE IF EXISTS clients CASCADE`
    await sql`DROP TABLE IF EXISTS profiles CASCADE`
    await sql`DROP TABLE IF EXISTS org_members CASCADE`
    await sql`DROP TABLE IF EXISTS organizations CASCADE`

    // Multi-tenant: each business is an organization
    await sql`
      CREATE TABLE organizations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        gstin VARCHAR(100),
        plan VARCHAR(50) DEFAULT 'free',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE org_members (
        id SERIAL PRIMARY KEY,
        org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        user_id VARCHAR(255),
        role VARCHAR(50) NOT NULL DEFAULT 'member',
        invited_email VARCHAR(255),
        invite_token VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    await sql`CREATE INDEX idx_org_members_user ON org_members(user_id)`
    await sql`CREATE INDEX idx_org_members_org ON org_members(org_id)`
    await sql`CREATE UNIQUE INDEX idx_org_members_token ON org_members(invite_token) WHERE invite_token IS NOT NULL`

    await sql`
      CREATE TABLE profiles (
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
      )
    `

    await sql`
      CREATE TABLE clients (
        id SERIAL PRIMARY KEY,
        org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        gstin VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE invoices (
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(org_id, invoice_number)
      )
    `

    await sql`
      CREATE TABLE payments (
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
      )
    `

    await sql`
      CREATE TABLE bank_transactions (
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Input GST — purchases/expenses with tax paid
    await sql`
      CREATE TABLE purchases (
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
      )
    `

    await sql`
      CREATE TABLE gst_sync_logs (
        id SERIAL PRIMARY KEY,
        org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        sync_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        records_synced INTEGER DEFAULT 0,
        error_message TEXT,
        sync_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    await sql`
      CREATE TABLE gst_ledger_entries (
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
      )
    `

    await sql`CREATE INDEX idx_invoices_client_id ON invoices(client_id)`
    await sql`CREATE INDEX idx_invoices_status ON invoices(status)`
    await sql`CREATE INDEX idx_invoices_org ON invoices(org_id)`
    await sql`CREATE INDEX idx_payments_invoice_id ON payments(invoice_id)`
    await sql`CREATE INDEX idx_payments_reconciled ON payments(reconciled)`
    await sql`CREATE INDEX idx_bank_transactions_reconciled ON bank_transactions(reconciled)`
    await sql`CREATE INDEX idx_bank_transactions_date ON bank_transactions(transaction_date)`
    await sql`CREATE INDEX idx_gst_ledger_org ON gst_ledger_entries(org_id)`
    await sql`CREATE INDEX idx_gst_sync_logs_org ON gst_sync_logs(org_id)`
    await sql`CREATE INDEX idx_purchases_org ON purchases(org_id)`

    await sql`
      CREATE TABLE invoice_templates (
        id SERIAL PRIMARY KEY,
        org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        config JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    await sql`CREATE INDEX idx_invoice_templates_org ON invoice_templates(org_id)`

    // Seed a default organization and profile for single-user mode
    const org = await sql`
      INSERT INTO organizations (name) VALUES ('My Business') RETURNING id
    `
    const orgId = org[0].id
    await sql`
      INSERT INTO profiles (org_id, full_name, email, phone, address)
      VALUES (${orgId}, 'Your Name', 'you@example.com', '+91 00000 00000', 'Your Address, City, State')
    `

    return NextResponse.json({ success: true, message: "Database initialised with multi-tenant schema", org_id: orgId })
  } catch (error) {
    console.error("[init-db] error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
