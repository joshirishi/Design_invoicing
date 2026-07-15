import { rawSql } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Users, DollarSign, AlertCircle, TrendingUp, Plus, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RevenueChart } from "@/components/revenue-chart"
import { RecentInvoices } from "@/components/recent-invoices"
import { InvoiceStatusChart } from "@/components/invoice-status-chart"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { getCurrentOrgId } from "@/lib/get-org"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  try {
    const orgId = await getCurrentOrgId()
    const oid = String(Math.floor(orgId))
    const [invoicesResult, clientsResult, paymentsResult, gstResult] = await Promise.all([
      rawSql(`SELECT id, invoice_number, invoice_date, total_amount, status FROM invoices WHERE org_id = ${oid} ORDER BY invoice_date DESC`),
      rawSql(`SELECT COUNT(*)::int as count FROM clients WHERE org_id = ${oid}`),
      rawSql(`SELECT amount, payment_date FROM payments WHERE org_id = ${oid}`),
      rawSql(`SELECT COALESCE(SUM(cgst_amount + sgst_amount + igst_amount), 0) AS current_month_gst FROM invoices WHERE org_id = ${oid} AND status != 'draft' AND DATE_TRUNC('month', invoice_date) = DATE_TRUNC('month', CURRENT_DATE)`),
    ])

    // Only block on zero invoices — payments/clients can be empty and we still show the dashboard
    const needsSetup = invoicesResult.length === 0

    if (needsSetup) {
      return (
        
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Welcome to your invoice management system</p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No data yet</AlertTitle>
              <AlertDescription>
                Create your first invoice or client to get started. If you see database errors, visit{" "}
                <a href="/api/migrations/invoice-items" className="underline font-medium">/api/migrations/invoice-items</a>{" "}
                to apply the latest schema migrations.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">Welcome! Here's how to begin:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Go to <strong>Clients</strong> and add your first client</li>
                  <li>Go to <strong>Invoices</strong> and create your first invoice</li>
                  <li>Upload a bank statement under <strong>Reconciliation</strong></li>
                </ol>
              </CardContent>
            </Card>
          </div>
        
      )
    }

    const invoices = invoicesResult || []
    const totalInvoices = invoices.length
    const totalClients = clientsResult[0]?.count || 0
    const currentMonthGST = Number(gstResult[0]?.current_month_gst || 0)

    const unpaidInvoices = invoices.filter((inv) => inv.status === "unpaid" || inv.status === "overdue").length
    const overdueInvoices = invoices.filter((inv) => inv.status === "overdue").length

    const totalRevenue = paymentsResult.reduce((sum, payment) => sum + Number(payment.amount), 0)
    const totalOutstanding = invoices
      .filter((inv: any) => inv.status === "unpaid" || inv.status === "overdue")
      .reduce((sum: number, inv: any) => sum + Number(inv.total_amount), 0)

    // Calculate monthly revenue for chart
    const monthlyRevenue = paymentsResult.reduce(
      (acc, payment) => {
        const month = new Date(payment.payment_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })
        acc[month] = (acc[month] || 0) + Number(payment.amount)
        return acc
      },
      {} as Record<string, number>,
    )

    const revenueData = Object.entries(monthlyRevenue || {}).map(([month, amount]) => ({
      month,
      amount,
    }))

    // Status breakdown
    const statusCounts = invoices.reduce(
      (acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const statusData = [
      { status: "Paid", count: statusCounts.paid || 0, color: "hsl(var(--chart-1))" },
      { status: "Unpaid", count: statusCounts.unpaid || 0, color: "hsl(var(--chart-2))" },
      { status: "Overdue", count: statusCounts.overdue || 0, color: "hsl(var(--chart-3))" },
      { status: "Partially Paid", count: statusCounts.partially_paid || 0, color: "hsl(var(--chart-4))" },
    ]

    // Recent invoices
    const recentInvoices = invoices
      .sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime())
      .slice(0, 5)

    return (
      
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back! Here&apos;s an overview of your business.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard/invoices/new">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  New Invoice
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalInvoices}</div>
                <p className="text-xs text-muted-foreground mt-1">{overdueInvoices > 0 ? <span className="text-red-500">{overdueInvoices} overdue</span> : "All up to date"}</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <div className="h-9 w-9 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalClients}</div>
                <p className="text-xs text-muted-foreground mt-1">Active clients</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Revenue Received</CardTitle>
                <div className="h-9 w-9 rounded-full bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">₹{totalRevenue.toLocaleString("en-IN")}</div>
                <p className="text-xs text-muted-foreground mt-1">From {paymentsResult.length} payments</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                <div className="h-9 w-9 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">₹{totalOutstanding.toLocaleString("en-IN")}</div>
                <p className="text-xs text-muted-foreground mt-1">{unpaidInvoices} unpaid invoices</p>
              </CardContent>
            </Card>
          </div>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent" />
            <CardContent className="flex items-center justify-between gap-4 py-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <Receipt className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">This month&apos;s GST liability</p>
                  <p className="text-2xl font-bold">₹{currentMonthGST.toLocaleString("en-IN")}</p>
                </div>
              </div>
              <Link href="/dashboard/gst-report">
                <Button variant="outline" size="sm">
                  Check GST Report
                </Button>
              </Link>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueChart data={revenueData} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Invoice Status</CardTitle>
              </CardHeader>
              <CardContent>
                <InvoiceStatusChart data={statusData} />
              </CardContent>
            </Card>
          </div>

          {overdueInvoices > 0 && (
            <Card className="border-destructive">
              <CardHeader className="flex flex-row items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">Attention Required</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  You have {overdueInvoices} overdue invoice{overdueInvoices > 1 ? "s" : ""} that need immediate
                  attention.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentInvoices invoices={recentInvoices} />
            </CardContent>
          </Card>
        </div>
      
    )
  } catch (error: any) {
    if (error.message?.includes("does not exist")) {
      return (
        
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Welcome to your invoice management system</p>
            </div>

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Database Setup Required</AlertTitle>
              <AlertDescription>
                Database tables are missing. Run these migrations once:{" "}
                <a href="/api/init-db" className="underline font-medium">/api/init-db</a>,{" "}
                <a href="/api/migrations/bank-v2" className="underline font-medium">/api/migrations/bank-v2</a>,{" "}
                <a href="/api/migrations/invoice-items" className="underline font-medium">/api/migrations/invoice-items</a>.
              </AlertDescription>
            </Alert>
          </div>
        
      )
    }
    throw error
  }
}
