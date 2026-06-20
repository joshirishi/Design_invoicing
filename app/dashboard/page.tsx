import { sql } from "@/lib/db"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Users, DollarSign, AlertCircle, TrendingUp } from "lucide-react"
import { RevenueChart } from "@/components/revenue-chart"
import { RecentInvoices } from "@/components/recent-invoices"
import { InvoiceStatusChart } from "@/components/invoice-status-chart"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default async function DashboardPage() {
  try {
    const [invoicesResult, clientsResult, paymentsResult] = await Promise.all([
      sql`SELECT * FROM invoices`,
      sql`SELECT COUNT(*)::int as count FROM clients`,
      sql`SELECT amount, payment_date FROM payments`,
    ])

    const needsSetup = invoicesResult.length === 0 || clientsResult.length === 0 || paymentsResult.length === 0

    if (needsSetup) {
      return (
        <DashboardLayout>
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Welcome to your invoice management system</p>
            </div>

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Database Setup Required</AlertTitle>
              <AlertDescription>
                The database tables haven't been created yet. Please run the SQL script{" "}
                <code className="bg-muted px-1 py-0.5 rounded">scripts/001_create_neon_schema.sql</code> from the
                Scripts section to set up your database.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">To get started with your invoice management system:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Navigate to the Scripts section in the sidebar</li>
                  <li>
                    Run the <code className="bg-muted px-1 py-0.5 rounded">001_create_neon_schema.sql</code> script
                  </li>
                  <li>Wait for the script to complete</li>
                  <li>Refresh this page to see your dashboard</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      )
    }

    const invoices = invoicesResult || []
    const totalInvoices = invoices.length
    const totalClients = clientsResult[0]?.count || 0

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
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here&apos;s an overview of your business.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalInvoices}</div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalClients}</div>
                <p className="text-xs text-muted-foreground mt-1">Active clients</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString("en-IN")}</div>
                <p className="text-xs text-muted-foreground mt-1">Received payments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalOutstanding.toLocaleString("en-IN")}</div>
                <p className="text-xs text-muted-foreground mt-1">{unpaidInvoices} unpaid invoices</p>
              </CardContent>
            </Card>
          </div>

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
      </DashboardLayout>
    )
  } catch (error: any) {
    if (error.message?.includes("does not exist")) {
      return (
        <DashboardLayout>
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Welcome to your invoice management system</p>
            </div>

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Database Setup Required</AlertTitle>
              <AlertDescription>
                The database tables haven't been created yet. Please run the SQL script{" "}
                <code className="bg-muted px-1 py-0.5 rounded">scripts/001_create_neon_schema.sql</code> from the
                Scripts section to set up your database.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">To get started with your invoice management system:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Navigate to the Scripts section in the sidebar</li>
                  <li>
                    Run the <code className="bg-muted px-1 py-0.5 rounded">001_create_neon_schema.sql</code> script
                  </li>
                  <li>Wait for the script to complete</li>
                  <li>Refresh this page to see your dashboard</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      )
    }
    throw error
  }
}
