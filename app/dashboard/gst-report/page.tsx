export const dynamic = "force-dynamic"

import { GSTReportView } from "@/components/gst-report-view"
import { GSTOptInBanner } from "@/components/gst-opt-in-banner"
import { GSTDocumentChecklist } from "@/components/gst-document-checklist"
import { GSTAlertsPanel } from "@/components/gst-alerts-panel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { Separator } from "@/components/ui/separator"

export default async function GSTReportPage() {
  const gstConfigured = await checkGSTConfiguration()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">GST Report</h1>
        <p className="text-muted-foreground">Track your GST obligations and manage compliance documents</p>
      </div>

      {/* Deadline alerts — client component, fetches its own data */}
      <GSTAlertsPanel />

      {/* GST setup banner if not connected */}
      {!gstConfigured && <GSTOptInBanner />}

      {/* What is GST guide */}
      <Card>
        <CardHeader>
          <CardTitle>Understanding Your GST Obligations</CardTitle>
          <CardDescription>What each document means and when it is due</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-green-700 dark:text-green-400">Output GST (Tax Collected)</h3>
              <p className="text-xs text-muted-foreground">GST you collect from clients on invoices. You owe this to the government via GSTR-3B.</p>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-blue-700 dark:text-blue-400">Input GST Credit (ITC)</h3>
              <p className="text-xs text-muted-foreground">GST paid on your business purchases. Claimed via GSTR-2B — reduces your final tax liability.</p>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-purple-700 dark:text-purple-400">Net GST Payable</h3>
              <p className="text-xs text-muted-foreground">Output GST minus Input ITC. This is what you actually pay the government via PMT-06 challan.</p>
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-muted px-4 py-3">
            <p className="text-xs font-medium">Monthly deadlines: GSTR-1 by 11th · GSTR-2B available by 14th · GSTR-3B by 20th</p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Document checklist + upload */}
      <div id="gst-checklist">
        <GSTDocumentChecklist />
      </div>

      <Separator />

      {/* GST figures report */}
      <GSTReportView />
    </div>
  )
}

async function checkGSTConfiguration() {
  try {
    const orgId = await getCurrentOrgId()
    const result = await sql`
      SELECT gst_integrated
      FROM profiles
      WHERE org_id = ${orgId}
      LIMIT 1
    `
    return result.length > 0 && result[0].gst_integrated
  } catch {
    return false
  }
}
