import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

// Returns system defaults (org_id IS NULL) + org-specific accounts
export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const accounts = await sql`
      SELECT * FROM chart_of_accounts
      WHERE (org_id IS NULL OR org_id = ${orgId})
        AND is_active = true
      ORDER BY
        CASE type
          WHEN 'Asset'     THEN 1
          WHEN 'Liability' THEN 2
          WHEN 'Equity'    THEN 3
          WHEN 'Income'    THEN 4
          WHEN 'Expense'   THEN 5
          ELSE 6
        END,
        name ASC
    `
    return NextResponse.json(accounts)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Create an org-specific account (not system)
export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { name, type, tally_group, tally_parent, parent_id } = await request.json()
    if (!name || !type || !tally_group) {
      return NextResponse.json({ error: "name, type, and tally_group are required" }, { status: 400 })
    }
    const result = await sql`
      INSERT INTO chart_of_accounts (org_id, name, type, tally_group, tally_parent, parent_id, is_system)
      VALUES (${orgId}, ${name}, ${type}, ${tally_group}, ${tally_parent || null}, ${parent_id || null}, false)
      RETURNING *
    `
    return NextResponse.json(result[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Update an org-specific account (cannot update is_system = true accounts)
export async function PUT(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { id, name, type, tally_group, tally_parent, parent_id, is_active } = await request.json()

    const existing = await sql`
      SELECT * FROM chart_of_accounts WHERE id = ${id} AND (org_id = ${orgId} OR org_id IS NULL)
    `
    if (!existing[0]) return NextResponse.json({ error: "Account not found" }, { status: 404 })
    if (existing[0].is_system && existing[0].org_id === null) {
      return NextResponse.json({ error: "Cannot edit system accounts" }, { status: 403 })
    }

    const result = await sql`
      UPDATE chart_of_accounts
      SET name = ${name}, type = ${type}, tally_group = ${tally_group},
          tally_parent = ${tally_parent || null}, parent_id = ${parent_id || null},
          is_active = ${is_active ?? true}, updated_at = NOW()
      WHERE id = ${id} AND org_id = ${orgId}
      RETURNING *
    `
    return NextResponse.json(result[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Soft-delete — set is_active = false (never hard-delete, entries may reference it)
export async function DELETE(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const existing = await sql`SELECT * FROM chart_of_accounts WHERE id = ${id}`
    if (existing[0]?.is_system) {
      return NextResponse.json({ error: "Cannot delete system accounts" }, { status: 403 })
    }
    await sql`
      UPDATE chart_of_accounts SET is_active = false, updated_at = NOW()
      WHERE id = ${id} AND org_id = ${orgId}
    `
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
