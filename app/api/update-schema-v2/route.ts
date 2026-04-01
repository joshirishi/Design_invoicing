import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Add missing columns to profiles table
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gstin TEXT`
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pan TEXT`
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_name TEXT`
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account TEXT`
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_ifsc TEXT`

    // Add missing columns to clients table
    await sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS gstin TEXT`

    // Add missing columns to invoices table
    await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 18`

    return NextResponse.json({
      success: true,
      message: "Schema updated successfully with GSTIN, tax_rate, and other fields"
    })
  } catch (error) {
    console.error('Schema update error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
