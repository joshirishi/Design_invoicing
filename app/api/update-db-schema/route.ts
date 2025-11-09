import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Add GST-related columns to profiles table
    await sql`
      ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS gstin VARCHAR(100),
      ADD COLUMN IF NOT EXISTS pan_no VARCHAR(100),
      ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS account_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS account_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS swift_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS branch VARCHAR(255),
      ADD COLUMN IF NOT EXISTS bank_address TEXT,
      ADD COLUMN IF NOT EXISTS gst_username VARCHAR(255),
      ADD COLUMN IF NOT EXISTS gst_api_key TEXT,
      ADD COLUMN IF NOT EXISTS gst_integrated BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS gst_last_sync TIMESTAMP WITH TIME ZONE
    `

    // Create GST sync log table
    await sql`
      CREATE TABLE IF NOT EXISTS gst_sync_logs (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
        sync_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        records_synced INTEGER DEFAULT 0,
        error_message TEXT,
        sync_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create GST ledger entries table
    await sql`
      CREATE TABLE IF NOT EXISTS gst_ledger_entries (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
        entry_date DATE NOT NULL,
        entry_type VARCHAR(50) NOT NULL,
        description TEXT,
        debit_amount DECIMAL(10, 2) DEFAULT 0,
        credit_amount DECIMAL(10, 2) DEFAULT 0,
        balance DECIMAL(10, 2) DEFAULT 0,
        transaction_id VARCHAR(255),
        gst_period VARCHAR(20),
        synced_from_gst BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_gst_ledger_profile ON gst_ledger_entries(profile_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_gst_ledger_date ON gst_ledger_entries(entry_date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_gst_sync_logs_profile ON gst_sync_logs(profile_id)`

    return NextResponse.json({
      success: true,
      message: "Database schema updated successfully with GST integration fields",
    })
  } catch (error) {
    console.error("[v0] Schema update error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
