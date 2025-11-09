import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { GSTAPIClient } from "@/lib/gst-api"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { syncType, fromDate, toDate, period } = body

    // Get GST credentials
    const profile = await sql`
      SELECT id, gstin, gst_username, gst_api_key, gst_integrated
      FROM profiles
      WHERE id = 1
    `

    if (profile.length === 0 || !profile[0].gst_integrated) {
      return NextResponse.json({ error: "GST not configured" }, { status: 400 })
    }

    const gstClient = new GSTAPIClient()
    gstClient.setCredentials({
      gstin: profile[0].gstin,
      username: profile[0].gst_username,
      apiKey: profile[0].gst_api_key,
    })

    // Authenticate first
    const authResult = await gstClient.authenticate()
    if (!authResult.success) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 })
    }

    let syncedRecords = 0
    let syncData: any = null

    // Sync based on type
    if (syncType === "cash_ledger") {
      const ledgerEntries = await gstClient.fetchCashLedger(fromDate, toDate)

      // Save ledger entries to database
      for (const entry of ledgerEntries) {
        await sql`
          INSERT INTO gst_ledger_entries (
            profile_id, entry_date, entry_type, description,
            debit_amount, credit_amount, balance, transaction_id,
            gst_period, synced_from_gst
          ) VALUES (
            ${profile[0].id},
            ${entry.date},
            'cash_ledger',
            ${entry.description},
            ${entry.debitAmount},
            ${entry.creditAmount},
            ${entry.balance},
            ${entry.transactionId},
            ${entry.period},
            TRUE
          )
          ON CONFLICT (transaction_id) DO UPDATE
          SET debit_amount = ${entry.debitAmount},
              credit_amount = ${entry.creditAmount},
              balance = ${entry.balance},
              updated_at = NOW()
        `
        syncedRecords++
      }

      syncData = { entries: ledgerEntries.length }
    } else if (syncType === "gstr1") {
      const gstr1Data = await gstClient.fetchGSTR1(period)
      syncData = gstr1Data
      syncedRecords = gstr1Data.b2b?.length || 0
    } else if (syncType === "gstr3b") {
      const gstr3bData = await gstClient.fetchGSTR3B(period)
      syncData = gstr3bData
      syncedRecords = 1
    }

    // Update last sync timestamp
    await sql`
      UPDATE profiles
      SET gst_last_sync = NOW()
      WHERE id = ${profile[0].id}
    `

    // Log the sync
    await sql`
      INSERT INTO gst_sync_logs (
        profile_id, sync_type, status, records_synced, sync_data
      ) VALUES (
        ${profile[0].id},
        ${syncType},
        'success',
        ${syncedRecords},
        ${JSON.stringify(syncData)}
      )
    `

    return NextResponse.json({
      success: true,
      syncType,
      recordsSynced: syncedRecords,
      data: syncData,
    })
  } catch (error: any) {
    console.error("[v0] GST sync error:", error)

    // Log failed sync
    await sql`
      INSERT INTO gst_sync_logs (
        profile_id, sync_type, status, error_message
      ) VALUES (
        1,
        ${request.json().then((b) => b.syncType)},
        'failed',
        ${error.message}
      )
    `

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Get sync history
export async function GET() {
  try {
    const logs = await sql`
      SELECT id, sync_type, status, records_synced, error_message, created_at
      FROM gst_sync_logs
      WHERE profile_id = 1
      ORDER BY created_at DESC
      LIMIT 50
    `

    return NextResponse.json(logs)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
