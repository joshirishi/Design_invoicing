import { rawSql } from "@/lib/db"
import { getCurrentOrgId } from "@/lib/get-org"
import { Button } from "@/components/ui/button"
import { Plus, AlertCircle } from "lucide-react"
import Link from "next/link"
import { InvoiceList } from "@/components/invoice-list"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InvoiceImportModal } from "@/components/invoice-import-modal"

export const dynamic = "force-dynamic"

export default async function InvoicesPage() {
  try {
    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))
    const invoices = await rawSql(`SELECT i.id, i.org_id, i.invoice_number, i.client_id, i.invoice_date, i.description, i.total_amount, i.cgst_amount, i.sgst_amount, i.status, i.payment_due_days, i.import_source, i.created_at, c.name AS client_name, c.email AS client_email, c.gstin AS client_gstin FROM invoices i LEFT JOIN clients c ON i.client_id = c.id WHERE i.org_id = ${oid} ORDER BY i.invoice_date DESC`)

    return (
      
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
              <p className="text-muted-foreground">Manage and track all your invoices</p>
            </div>
            <div className="flex items-center gap-2">
              <InvoiceImportModal />
              <Link href="/dashboard/invoices/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Invoice
                </Button>
              </Link>
            </div>
          </div>

          <InvoiceList invoices={invoices} />
        </div>
      
    )
  } catch (error: any) {
    if (error.message?.includes("does not exist")) {
      return (
        
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
              <p className="text-muted-foreground">Manage and track all your invoices</p>
            </div>

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Database Setup Required</AlertTitle>
              <AlertDescription>
                Tables are missing. Visit{" "}
                <a href="/api/init-db" className="underline font-medium">/api/init-db</a>{" "}
                then{" "}
                <a href="/api/migrations/invoice-items" className="underline font-medium">/api/migrations/invoice-items</a>{" "}
                to set up the database.
              </AlertDescription>
            </Alert>
          </div>
        
      )
    }
    throw error
  }
}
