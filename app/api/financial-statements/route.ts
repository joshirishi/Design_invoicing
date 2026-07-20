import { NextResponse } from "next/server"
import { getCurrentOrgId } from "@/lib/get-org"
import { getProfitAndLoss, getBalanceSheet } from "@/lib/journal"
import { getFinancialYear } from "@/lib/financial-year"

export const dynamic = "force-dynamic"

// GET /api/financial-statements?startDate=&endDate=&asOfDate=
export async function GET(request: Request) {
  try {
    const orgId = await getCurrentOrgId()
    const { searchParams } = new URL(request.url)
    const currentFy = getFinancialYear(new Date())
    const fyStart = `${currentFy.slice(0, 4)}-04-01`

    const startDate = searchParams.get("startDate") || fyStart
    const endDate = searchParams.get("endDate") || new Date().toISOString().split("T")[0]
    const asOfDate = searchParams.get("asOfDate") || endDate

    const [pnl, balanceSheet] = await Promise.all([
      getProfitAndLoss(orgId, startDate, endDate),
      getBalanceSheet(orgId, asOfDate),
    ])

    return NextResponse.json({ pnl, balanceSheet, period: { startDate, endDate, asOfDate } })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
