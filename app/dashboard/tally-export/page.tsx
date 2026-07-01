export const dynamic = "force-dynamic"

import { TallyExportView } from "@/components/tally-export-view"
import { getFinancialYear } from "@/lib/financial-year"

export default function TallyExportPage() {
  const currentFY = getFinancialYear(new Date())

  // Build last 4 FY options
  const fyOptions: string[] = []
  const [startYearStr] = currentFY.split("-")
  const startYear = parseInt(startYearStr)
  for (let i = 0; i < 4; i++) {
    const y = startYear - i
    fyOptions.push(`${y}-${String(y + 1).slice(-2)}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tally Export</h1>
        <p className="text-muted-foreground">
          Generate Tally Prime–compatible XML to import your books — Sales, Purchases, and Receipts
        </p>
      </div>
      <TallyExportView currentFY={currentFY} fyOptions={fyOptions} />
    </div>
  )
}
