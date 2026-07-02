import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { GSTAPIClient, validateGSTIN } from "@/lib/gst-api"
import { getCurrentOrgId } from "@/lib/get-org"

// Get GST credentials
export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const profile = await sql`
      SELECT id, gstin, gst_username, gst_integrated, gst_last_sync
      FROM profiles
      WHERE org_id = ${orgId}
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

// Step 1: Initiate GST connection — validates GSTIN, triggers OTP (real mode) or saves directly (mock mode)
export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const body = await request.json()
    const { gstin, username, apiKey, useMockAPI } = body

    if (useMockAPI) {
      // Mock mode: skip OTP, save immediately
      await sql`
        UPDATE profiles
        SET gstin = ${gstin || "27AGSPJ2168A1ZF"},
            gst_username = ${username || "mock.user"},
            gst_api_key = ${"mock-key"},
            gst_integrated = TRUE,
            updated_at = NOW()
        WHERE org_id = ${orgId}
      `
      await sql`
        INSERT INTO gst_sync_logs (profile_id, sync_type, status, records_synced)
        SELECT id, 'credential_setup', 'success', 0 FROM profiles WHERE org_id = ${orgId} LIMIT 1
      `
      return NextResponse.json({ success: true, mockMode: true, message: "Mock GST connected successfully" })
    }

    // Real mode: validate GSTIN then initiate OTP flow
    if (!validateGSTIN(gstin)) {
      return NextResponse.json({ error: "Invalid GSTIN format. Must be 15 characters (e.g. 27AGSPJ2168A1ZF)" }, { status: 400 })
    }

    if (!username) {
      return NextResponse.json({ error: "GST portal username is required" }, { status: 400 })
    }

    const gstClient = new GSTAPIClient(false)
    gstClient.setCredentials({ gstin, username, apiKey: apiKey || "" })

    const initResult = await gstClient.initiateAuth(gstin, username)

    if (!initResult.success) {
      return NextResponse.json({ error: initResult.error || "Failed to send OTP" }, { status: 400 })
    }

    // Save GSTIN + username to profile (not yet marked as integrated — pending OTP)
    await sql`
      UPDATE profiles
      SET gstin = ${gstin},
          gst_username = ${username},
          gst_integrated = FALSE,
          updated_at = NOW()
      WHERE org_id = ${orgId}
    `

    return NextResponse.json({
      success: true,
      otpRequired: true,
      refId: initResult.refId,
      message: "OTP sent to your GST-registered mobile number",
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Step 2: Verify OTP and complete connection
export async function PATCH(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const body = await request.json()
    const { refId, otp } = body

    if (!refId || !otp) {
      return NextResponse.json({ error: "OTP and reference ID are required" }, { status: 400 })
    }

    const gstClient = new GSTAPIClient(false)
    const verifyResult = await gstClient.verifyOTP(refId, otp)

    if (!verifyResult.success) {
      return NextResponse.json({ error: verifyResult.error || "Invalid OTP" }, { status: 401 })
    }

    // Mark as integrated and store session token
    await sql`
      UPDATE profiles
      SET gst_integrated = TRUE,
          gst_api_key = ${verifyResult.token || ""},
          updated_at = NOW()
      WHERE org_id = ${orgId}
    `

    await sql`
      INSERT INTO gst_sync_logs (profile_id, sync_type, status, records_synced)
      SELECT id, 'credential_setup', 'success', 0 FROM profiles WHERE org_id = ${orgId} LIMIT 1
    `

    return NextResponse.json({ success: true, message: "GST portal connected successfully" })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Test existing GST connection
export async function PUT() {
  try {
    const orgId = await getCurrentOrgId()
    const profile = await sql`
      SELECT gstin, gst_username, gst_api_key
      FROM profiles
      WHERE org_id = ${orgId}
      LIMIT 1
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
