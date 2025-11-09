import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { GSTAPIClient, validateGSTIN } from "@/lib/gst-api"

// Get GST credentials
export async function GET() {
  try {
    const profile = await sql`
      SELECT id, gstin, gst_username, gst_integrated, gst_last_sync
      FROM profiles
      LIMIT 1
    `

    if (profile.length === 0) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    return NextResponse.json({
      gstin: profile[0].gstin,
      username: profile[0].gst_username,
      integrated: profile[0].gst_integrated,
      lastSync: profile[0].gst_last_sync,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Save GST credentials
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gstin, username, apiKey } = body

    // Validate GSTIN
    if (!validateGSTIN(gstin)) {
      return NextResponse.json({ error: "Invalid GSTIN format" }, { status: 400 })
    }

    // Test authentication with GST API
    const gstClient = new GSTAPIClient()
    gstClient.setCredentials({ gstin, username, apiKey })

    const authResult = await gstClient.authenticate()

    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error || "Authentication failed" }, { status: 401 })
    }

    // Save credentials to database
    await sql`
      UPDATE profiles
      SET gstin = ${gstin},
          gst_username = ${username},
          gst_api_key = ${apiKey},
          gst_integrated = TRUE,
          updated_at = NOW()
      WHERE id = 1
    `

    // Log the integration
    await sql`
      INSERT INTO gst_sync_logs (profile_id, sync_type, status, records_synced)
      VALUES (1, 'credential_setup', 'success', 0)
    `

    return NextResponse.json({
      success: true,
      message: "GST credentials saved and verified successfully",
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Test GST connection
export async function PUT(request: NextRequest) {
  try {
    const profile = await sql`
      SELECT gstin, gst_username, gst_api_key
      FROM profiles
      WHERE id = 1
    `

    if (profile.length === 0 || !profile[0].gst_api_key) {
      return NextResponse.json({ error: "GST credentials not configured" }, { status: 400 })
    }

    const gstClient = new GSTAPIClient()
    gstClient.setCredentials({
      gstin: profile[0].gstin,
      username: profile[0].gst_username,
      apiKey: profile[0].gst_api_key,
    })

    const authResult = await gstClient.authenticate()

    return NextResponse.json({
      success: authResult.success,
      message: authResult.success ? "Connection successful" : authResult.error,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
