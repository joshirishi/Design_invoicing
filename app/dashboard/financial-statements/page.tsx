export const dynamic = "force-dynamic"

import { FinancialStatementsView } from "@/components/financial-statements-view"

export default function FinancialStatementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financial Statements</h1>
        <p className="text-muted-foreground">
          Profit &amp; Loss and Balance Sheet — built entirely from your Ledger's journal entries
        </p>
      </div>
      <FinancialStatementsView />
    </div>
  )
}
