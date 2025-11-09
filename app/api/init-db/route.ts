import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Drop existing tables if they exist
    await sql`DROP TABLE IF EXISTS bank_transactions CASCADE`
    await sql`DROP TABLE IF EXISTS payments CASCADE`
    await sql`DROP TABLE IF EXISTS invoices CASCADE`
    await sql`DROP TABLE IF EXISTS clients CASCADE`
    await sql`DROP TABLE IF EXISTS profiles CASCADE`

    // Create profiles table
    await sql`
      CREATE TABLE profiles (
        id SERIAL PRIMARY KEY,
        business_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100),
        tax_id VARCHAR(100),
        logo_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create clients table
    await sql`
      CREATE TABLE clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create invoices table
    await sql`
      CREATE TABLE invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(100) UNIQUE NOT NULL,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        issue_date DATE NOT NULL,
        due_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'draft',
        subtotal DECIMAL(10, 2) NOT NULL,
        tax DECIMAL(10, 2) DEFAULT 0,
        total DECIMAL(10, 2) NOT NULL,
        notes TEXT,
        items JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create payments table
    await sql`
      CREATE TABLE payments (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        payment_date DATE NOT NULL,
        payment_method VARCHAR(100),
        reference_number VARCHAR(255),
        notes TEXT,
        reconciled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create bank_transactions table
    await sql`
      CREATE TABLE bank_transactions (
        id SERIAL PRIMARY KEY,
        transaction_date DATE NOT NULL,
        description TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        balance DECIMAL(10, 2),
        category VARCHAR(100),
        reconciled BOOLEAN DEFAULT FALSE,
        matched_payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create indexes
    await sql`CREATE INDEX idx_invoices_client_id ON invoices(client_id)`
    await sql`CREATE INDEX idx_invoices_status ON invoices(status)`
    await sql`CREATE INDEX idx_payments_invoice_id ON payments(invoice_id)`
    await sql`CREATE INDEX idx_payments_reconciled ON payments(reconciled)`
    await sql`CREATE INDEX idx_bank_transactions_reconciled ON bank_transactions(reconciled)`
    await sql`CREATE INDEX idx_bank_transactions_date ON bank_transactions(transaction_date)`

    // Insert default profile
    await sql`
      INSERT INTO profiles (
        business_name,
        email,
        phone,
        address,
        city,
        state,
        postal_code,
        country
      ) VALUES (
        'My Business',
        'business@example.com',
        '+1234567890',
        '123 Business Street',
        'Business City',
        'Business State',
        '12345',
        'USA'
      )
    `

    return NextResponse.json({
      success: true,
      message: "Database initialized successfully",
    })
  } catch (error) {
    console.error("[v0] Database initialization error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
