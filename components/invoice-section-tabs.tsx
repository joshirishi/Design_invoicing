"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const TABS = [
  { label: "All Invoices", href: "/dashboard/invoices" },
  { label: "Templates", href: "/dashboard/invoices/templates" },
]

// Route-backed tabs, not shadcn Tabs' internal state — each "tab" is a real
// page (list vs. template gallery), so navigation has to actually change the
// URL. Styled to read as one tab bar so Templates no longer looks like a
// separate destination from Invoices.
export function InvoiceSectionTabs() {
  const pathname = usePathname()
  return (
    <div className="flex gap-1 border-b">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
