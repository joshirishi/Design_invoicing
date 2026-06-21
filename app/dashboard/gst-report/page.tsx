export const dynamic = "force-dynamic"

import { DashboardLayout } from "@/components/dashboard-layout"
import { GSTReportView } from "@/components/gst-report-view"
import { GSTOptInBanner } from "@/components/gst-opt-in-banner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { sql } from "@/lib/db"

export default async function GSTReportPage() {
  const gstConfigured = await checkGSTConfiguration()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GST Report</h1>
          <p className="text-muted-foreground">Track your GST collections and payments</p>
        </div>

        {!gstConfigured && <GSTOptInBanner />}

        <Card>
          <CardHeader>
            <CardTitle>What is GST Tracking?</CardTitle>
            <CardDescription>Understanding your tax obligations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h3 className="font-semibold text-green-600">Output GST (Tax Collected)</h3>
                <p className="text-sm text-muted-foreground">
                  GST you collect from your clients on invoices. This is money you owe to the government.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-600">Input GST (Tax Paid)</h3>
                <p className="text-sm text-muted-foreground">
                  GST you pay on business purchases. This reduces your tax liability as a credit.
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm">
                <strong>Net GST Payable = Output GST - Input GST</strong>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                This report currently shows Output GST from your invoices. Track which invoices are paid and reconciled
                to understand your cash flow vs tax obligations.
              </p>
            </div>
          </CardContent>
        </Card>

        <GSTReportView />
      </div>
    </DashboardLayout>
  )
}

async function checkGSTConfiguration() {
  try {
    const result = await sql`
      SELECT gst_integrated 
      FROM profiles 
      WHERE id = 1
      LIMIT 1
    `
    return result.length > 0 && result[0].gst_integrated
  } catch {
    return false
  }
}
