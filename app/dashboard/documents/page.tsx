export const dynamic = "force-dynamic"

import { DocumentHub } from "@/components/document-hub"
import { GSTDocumentChecklist } from "@/components/gst-document-checklist"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { sql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"

export default async function DocumentsPage() {
  const orgId = await getCurrentOrgId()
  const accounts = await sql`SELECT id, nickname FROM bank_accounts WHERE org_id = ${orgId} ORDER BY created_at ASC`

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          One place to add anything — bank statements, UPI exports, GST downloads, broker reports. The platform
          figures out what it is and where it belongs.
        </p>
      </div>

      <DocumentHub accounts={accounts as any} />

      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">What is this?</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Most CA work starts with a pile of documents — bank statements, UPI exports, the GST portal's own
            downloads, broker capital-gains reports. Normally you'd need to know which page each one belongs to.
            Here, drop the file once: it's inspected (never trusted blindly), you're shown what was detected, and
            only on your confirmation is it saved to the right place — bank transactions, UPI contact lookup, ITC
            reconciliation, capital gains, or your GST document records below.
          </CardDescription>
        </CardHeader>
      </Card>

      <GSTDocumentChecklist />
    </div>
  )
}
