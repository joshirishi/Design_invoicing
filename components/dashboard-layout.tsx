"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { FileText, Users, DollarSign, BarChart3, Upload, Settings, Menu, Receipt } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Invoices", href: "/dashboard/invoices", icon: FileText },
  { name: "Clients", href: "/dashboard/clients", icon: Users },
  { name: "Payments", href: "/dashboard/payments", icon: DollarSign },
  { name: "Reconciliation", href: "/dashboard/reconciliation", icon: Upload },
  { name: "GST Report", href: "/dashboard/gst-report", icon: Receipt },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const NavContent = () => (
    <>
      <div className="flex items-center gap-2 px-6 py-4 border-b">
        <FileText className="h-6 w-6" />
        <span className="text-xl font-bold">InvoiceFlow</span>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
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
      </nav>
      <div className="border-t p-4 space-y-1">
        <Link href="/dashboard/settings">
          <Button variant="ghost" className="w-full justify-start gap-3">
            <Settings className="h-5 w-5" />
            Settings
          </Button>
        </Link>
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
          <SheetContent side="left" className="w-64 p-0">
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
