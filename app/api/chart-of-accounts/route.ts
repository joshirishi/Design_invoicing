import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

// Returns system defaults (org_id IS NULL) + org-specific accounts
// NOTE: must be single-line — multi-line SELECTs silently return empty via the exec_sql RPC
// (confirmed independent of JOINs/CASE — even a bare multi-line SELECT triggers it).
export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const accounts = await sql`SELECT * FROM chart_of_accounts WHERE (org_id IS NULL OR org_id = ${orgId}) AND is_active = true ORDER BY CASE type WHEN 'Asset' THEN 1 WHEN 'Liability' THEN 2 WHEN 'Equity' THEN 3 WHEN 'Income' THEN 4 WHEN 'Expense' THEN 5 ELSE 6 END, name ASC`
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
    // NOTE: query text must not start with a newline right after the backtick — the
    // exec_sql RPC silently fails to return RETURNING/SELECT output when it does
    // (confirmed: the write itself still runs, only the returned rows are lost).
    const result = await sql`INSERT INTO chart_of_accounts (org_id, name, type, tally_group, tally_parent, parent_id, is_system)
      VALUES (${orgId}, ${name}, ${type}, ${tally_group}, ${tally_parent || null}, ${parent_id || null}, false)
      RETURNING *`
    return NextResponse.json(result[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Update any account the org can see — including system defaults (org_id IS NULL).
// The tree is meant to be fully editable at any level (rename, reparent). We deliberately
// do NOT block edits to system rows: in this single-tenant app they behave as the org's
// own tree, just seeded by default. Prevents accidentally creating a cycle (id === parent_id).
export async function PUT(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { id, name, type, tally_group, tally_parent, parent_id, is_active } = await request.json()

    // NOTE: must be a single physical line — multi-line SELECTs silently return empty via the exec_sql RPC.
    const existing = await sql`SELECT * FROM chart_of_accounts WHERE id = ${id} AND (org_id = ${orgId} OR org_id IS NULL)`
    if (!existing[0]) return NextResponse.json({ error: "Account not found" }, { status: 404 })

    if (parent_id && Number(parent_id) === Number(id)) {
      return NextResponse.json({ error: "An account cannot be its own parent" }, { status: 400 })
    }
    if (parent_id) {
      // Prevent creating a cycle: walk up from the proposed new parent and make sure
      // we never encounter the account being moved.
      let cursor: number | null = Number(parent_id)
      const seen = new Set<number>()
      while (cursor != null && !seen.has(cursor)) {
        if (cursor === Number(id)) {
          return NextResponse.json({ error: "Cannot move an account under one of its own descendants" }, { status: 400 })
        }
        seen.add(cursor)
        const parentRow = await sql`SELECT parent_id FROM chart_of_accounts WHERE id = ${cursor} LIMIT 1`
        cursor = parentRow[0]?.parent_id != null ? Number(parentRow[0].parent_id) : null
      }
    }

    // System rows have org_id IS NULL — match that explicitly since they're not owned by this org.
    // NOTE: must not start with a newline — see comment in POST above.
    const result = await sql`UPDATE chart_of_accounts
      SET name = ${name}, type = ${type}, tally_group = ${tally_group},
          tally_parent = ${tally_parent || null}, parent_id = ${parent_id || null},
          is_active = ${is_active ?? true}, updated_at = NOW()
      WHERE id = ${id} AND (org_id = ${orgId} OR org_id IS NULL)
      RETURNING *`
    return NextResponse.json(result[0])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Soft-delete — set is_active = false (never hard-delete, entries may reference it).
// Hardened: blocks deletion if the account has children, or is referenced by bank
// transactions / category rules, so the tree and existing categorizations never
// silently point at a "deleted" node. Callers should reassign first, then retry.
export async function DELETE(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const existing = await sql`SELECT * FROM chart_of_accounts WHERE id = ${id} AND (org_id = ${orgId} OR org_id IS NULL)`
    if (!existing[0]) return NextResponse.json({ error: "Account not found" }, { status: 404 })
    if (existing[0].is_system) {
      return NextResponse.json({ error: "Cannot delete system accounts — you can still rename or move them." }, { status: 403 })
    }

    const [children, txnRefs, ruleRefs] = await Promise.all([
      sql`SELECT COUNT(*) AS n FROM chart_of_accounts WHERE parent_id = ${id} AND is_active = true`,
      sql`SELECT COUNT(*) AS n FROM bank_transactions WHERE ledger_id = ${id}`,
      sql`SELECT COUNT(*) AS n FROM category_rules WHERE chart_account_id = ${id}`,
    ])
    const childCount = Number(children[0]?.n ?? 0)
    const txnCount = Number(txnRefs[0]?.n ?? 0)
    const ruleCount = Number(ruleRefs[0]?.n ?? 0)

    if (childCount > 0 || txnCount > 0 || ruleCount > 0) {
      return NextResponse.json(
        {
          error: "This account is still in use and can't be deleted yet.",
          details: {
            children: childCount,
            transactions: txnCount,
            rules: ruleCount,
          },
          hint: "Move or delete its subcategories, and reassign any linked transactions/rules to another account first.",
        },
        { status: 409 },
      )
    }

    await sql`UPDATE chart_of_accounts SET is_active = false, updated_at = NOW()
      WHERE id = ${id} AND org_id = ${orgId}`
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
