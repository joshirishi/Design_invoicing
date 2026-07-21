"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { FileText, Users, DollarSign, BarChart3, Upload, Settings, Menu, Receipt, ShoppingBag, PieChart, LogOut, Paintbrush, Store, BookOpen, ArrowDownToLine, UserCog, TrendingUp, ScrollText, CalendarClock, FolderOpen } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { createBrowserClient } from "@/lib/supabase-auth"

const navigation = [
  { name: "Dashboard",         href: "/dashboard",                         icon: BarChart3       },
  { name: "Account Summary",   href: "/dashboard/account-summary",         icon: PieChart        },
  { name: "Documents",         href: "/dashboard/documents",               icon: FolderOpen      },
  { name: "Invoices",          href: "/dashboard/invoices",                icon: FileText        },
  { name: "Invoice Templates", href: "/dashboard/invoices/templates",      icon: Paintbrush      },
  { name: "Clients",           href: "/dashboard/clients",                 icon: Users           },
  { name: "Payments",          href: "/dashboard/payments",                icon: DollarSign      },
  { name: "Purchases",         href: "/dashboard/purchases",               icon: ShoppingBag     },
  { name: "Vendors",           href: "/dashboard/vendors",                 icon: Store           },
  { name: "Payees",            href: "/dashboard/payees",                  icon: UserCog         },
  { name: "Capital Gains",     href: "/dashboard/capital-gains",           icon: TrendingUp      },
  { name: "Reconciliation",    href: "/dashboard/reconciliation",          icon: Upload          },
  { name: "GST Report",        href: "/dashboard/gst-report",              icon: Receipt         },
  { name: "Tally Export",      href: "/dashboard/tally-export",            icon: ArrowDownToLine },
  { name: "Chart of Accounts", href: "/dashboard/ledger",                  icon: BookOpen        },
  { name: "Financial Statements", href: "/dashboard/financial-statements", icon: ScrollText      },
  { name: "Advance Tax",       href: "/dashboard/advance-tax",             icon: CalendarClock   },
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
