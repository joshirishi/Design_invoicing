import { Button } from "@/components/ui/button"
import { FileText, TrendingUp, Users, DollarSign } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <span className="text-xl font-bold">InvoiceFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Professional Invoice Management
            <br />
            <span className="text-muted-foreground">Made Simple</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Create, track, and reconcile invoices with ease. Automate your billing workflow and get paid faster.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg">Go to Dashboard</Button>
            </Link>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-24">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Create Invoices</h3>
                <p className="text-sm text-muted-foreground">
                  Generate professional invoices with GST calculations in seconds
                </p>
              </div>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Manage Clients</h3>
                <p className="text-sm text-muted-foreground">Keep all your client information organized in one place</p>
              </div>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Track Payments</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor payment status and reconcile with bank statements
                </p>
              </div>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Analytics</h3>
                <p className="text-sm text-muted-foreground">Get insights into your revenue and outstanding payments</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 InvoiceFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
