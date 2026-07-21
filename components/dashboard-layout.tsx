"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { FileText, Users, DollarSign, BarChart3, Upload, Settings, Menu, Receipt, ShoppingBag, LogOut, Store, BookOpen, ArrowDownToLine, UserCog, TrendingUp, ScrollText, CalendarClock, FolderOpen } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { createBrowserClient } from "@/lib/supabase-auth"

// Grouped nav — 6 sections instead of 17 flat items. Each item stays reachable
// in exactly 2 clicks (group is always expanded, not a second navigation step).
// Account Summary and Invoice Templates deliberately don't have top-level
// entries here: Account Summary is a drill-down reached from Dashboard, and
// Templates is a tab inside Invoices — both are one interaction away from
// their parent screen instead of competing for space in primary nav.
const navGroups = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
    ],
  },
  {
    label: "Sales",
    items: [
      { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
      { name: "Clients", href: "/dashboard/clients", icon: Users },
      { name: "Payments", href: "/dashboard/payments", icon: DollarSign },
    ],
  },
  {
    label: "Purchases & Payroll",
    items: [
      { name: "Purchases", href: "/dashboard/purchases", icon: ShoppingBag },
      { name: "Vendors", href: "/dashboard/vendors", icon: Store },
      { name: "Payees", href: "/dashboard/payees", icon: UserCog },
    ],
  },
  {
    label: "Bank & Documents",
    items: [
      { name: "Reconciliation", href: "/dashboard/reconciliation", icon: Upload },
      { name: "All Documents", href: "/dashboard/documents", icon: FolderOpen },
      { name: "Capital Gains", href: "/dashboard/capital-gains", icon: TrendingUp },
    ],
  },
  {
    label: "Compliance",
    items: [
      { name: "GST Report", href: "/dashboard/gst-report", icon: Receipt },
      { name: "Advance Tax", href: "/dashboard/advance-tax", icon: CalendarClock },
      { name: "Tally Export", href: "/dashboard/tally-export", icon: ArrowDownToLine },
    ],
  },
  {
    label: "Books",
    items: [
      { name: "Chart of Accounts", href: "/dashboard/ledger", icon: BookOpen },
      { name: "Financial Statements", href: "/dashboard/financial-statements", icon: ScrollText },
    ],
  },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()

  async function signOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  const NavContent = () => (
    <>
      <div className="flex items-center gap-2 px-6 py-4 border-b">
        <FileText className="h-6 w-6" />
        <span className="text-xl font-bold">InvoiceFlow</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                return (
                  <Link key={item.name} href={item.href}>
                    <Button variant={isActive ? "secondary" : "ghost"} className="w-full justify-start gap-3" size="default">
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Button>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t p-4 space-y-1">
        <Link href="/dashboard/settings">
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Settings className="h-5 w-5" />
            Settings
          </Button>
        </Link>
        <Button variant="ghost" className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={signOut}>
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r bg-card">{<NavContent />}</aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-16 border-b bg-background">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          <span className="text-xl font-bold">InvoiceFlow</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 flex flex-col">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
        <div className="container mx-auto p-6 max-w-7xl">{children}</div>
      </main>
    </div>
  )
}
