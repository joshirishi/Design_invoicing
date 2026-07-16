import { type NextRequest, NextResponse } from "next/server"
import { rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { createManualJournalEntry } from "@/lib/journal"

export const dynamic = "force-dynamic"

// GET /api/journal-entries — list entries (header + lines), newest first.
export async function GET() {
  try {
    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))

    // Single-line rawSql — multi-line SELECTs with JOINs silently return empty via exec_sql RPC.
    const entries = await rawSql(`SELECT id, entry_date, narration, source_type, source_id, created_at FROM journal_entries WHERE org_id = ${oid} ORDER BY entry_date DESC, id DESC`)
    if (entries.length === 0) return NextResponse.json([])

    const ids = entries.map((e) => e.id).join(",")
    const lines = await rawSql(`SELECT l.entry_id, l.account_id, l.debit, l.credit, a.name AS account_name, a.type AS account_type FROM journal_entry_lines l JOIN chart_of_accounts a ON a.id = l.account_id WHERE l.entry_id IN (${ids}) ORDER BY l.id ASC`)

    const linesByEntry = new Map<number, typeof lines>()
    for (const line of lines) {
      const key = Number(line.entry_id)
      if (!linesByEntry.has(key)) linesByEntry.set(key, [])
      linesByEntry.get(key)!.push(line)
    }

    const result = entries.map((e) => {
      const entryLines = linesByEntry.get(Number(e.id)) ?? []
      const total = entryLines.reduce((s, l) => s + Number(l.debit || 0), 0)
      return { ...e, lines: entryLines, total }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/journal-entries — manual entry (US-51).
// Body: { date, narration, lines: [{ account_id, debit, credit }, ...] }
export async function POST(request: NextRequest) {
  try {
    const orgId = await getCurrentOrgId()
    const body = await request.json()
    const { date, narration, lines } = body

    if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 })
    if (!Array.isArray(lines) || lines.length < 2) {
      return NextResponse.json({ error: "At least two lines are required" }, { status: 400 })
    }

    const cleanLines = lines.map((l: any) => ({
      account_id: Number(l.account_id),
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
    }))

    const entryId = await createManualJournalEntry(orgId, {
      date,
      narration: narration || "Manual journal entry",
      lines: cleanLines,
    })

    return NextResponse.json({ id: entryId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
