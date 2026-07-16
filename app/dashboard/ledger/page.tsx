export const dynamic = "force-dynamic"

import { sql, rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { getTrialBalance } from "@/lib/journal"
import { LedgerView } from "@/components/ledger-view"
import { TrialBalanceView } from "@/components/trial-balance-view"
import { JournalView } from "@/components/journal-view"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { JournalEntry } from "@/lib/types"

export default async function LedgerPage() {
  const orgId = await getCurrentOrgId()
  // NOTE: must be single-line — multi-line SELECTs silently return empty via the exec_sql RPC.
  const accounts = await sql`SELECT * FROM chart_of_accounts WHERE (org_id IS NULL OR org_id = ${orgId}) AND is_active = true ORDER BY CASE type WHEN 'Asset' THEN 1 WHEN 'Liability' THEN 2 WHEN 'Equity' THEN 3 WHEN 'Income' THEN 4 WHEN 'Expense' THEN 5 ELSE 6 END, name ASC`.catch(() => [])

  const trialBalanceRows = await getTrialBalance(orgId).catch(() => [])
  const totalDebit = trialBalanceRows.reduce((s, r) => s + Number(r.debit || 0), 0)
  const totalCredit = trialBalanceRows.reduce((s, r) => s + Number(r.credit || 0), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01

  const oid = String(Math.floor(orgId))
  const entryHeaders = await rawSql(
    `SELECT id, entry_date, narration, source_type, source_id, created_at FROM journal_entries WHERE org_id = ${oid} ORDER BY entry_date DESC, id DESC LIMIT 200`,
  ).catch(() => [])
  let journalEntries: JournalEntry[] = []
  if (entryHeaders.length > 0) {
    const ids = entryHeaders.map((e) => e.id).join(",")
    const lines = await rawSql(
      `SELECT l.entry_id, l.account_id, l.debit, l.credit, a.name AS account_name, a.type AS account_type FROM journal_entry_lines l JOIN chart_of_accounts a ON a.id = l.account_id WHERE l.entry_id IN (${ids}) ORDER BY l.id ASC`,
    ).catch(() => [])
    const linesByEntry = new Map<number, typeof lines>()
    for (const line of lines) {
      const key = Number(line.entry_id)
      if (!linesByEntry.has(key)) linesByEntry.set(key, [])
      linesByEntry.get(key)!.push(line)
    }
    journalEntries = entryHeaders.map((e) => ({
      ...(e as any),
      lines: linesByEntry.get(Number(e.id)) ?? [],
    })) as JournalEntry[]
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ledger</h1>
        <p className="text-muted-foreground">
          Double-entry books, journal register, and the Chart of Accounts they post to
        </p>
      </div>
      <Tabs defaultValue="trial-balance">
        <TabsList>
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
          <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
        </TabsList>
        <TabsContent value="trial-balance" className="pt-4">
          <TrialBalanceView rows={trialBalanceRows as any} totalDebit={totalDebit} totalCredit={totalCredit} balanced={balanced} />
        </TabsContent>
        <TabsContent value="journal" className="pt-4">
          <JournalView entries={journalEntries} accounts={accounts as any} />
        </TabsContent>
        <TabsContent value="chart-of-accounts" className="pt-4">
          <LedgerView accounts={accounts as any} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
