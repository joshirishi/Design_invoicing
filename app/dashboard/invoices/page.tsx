import { sql } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Plus, AlertCircle } from "lucide-react"
import Link from "next/link"
import { InvoiceList } from "@/components/invoice-list"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InvoiceImportModal } from "@/components/invoice-import-modal"

export const dynamic = "force-dynamic"

export default async function InvoicesPage() {
  try {
    const invoices = await sql`
      SELECT i.*,
             json_build_object('id', c.id, 'name', c.name, 'email', c.email, 'gstin', c.gstin) as client
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      ORDER BY i.invoice_date DESC
    `

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
