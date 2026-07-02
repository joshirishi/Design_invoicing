"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Clock, CheckCircle2, X, ArrowRight, ExternalLink } from "lucide-react"
import Link from "next/link"

interface GSTDoc {
  id: number
  doc_type: string
  period: string | null
  status: string
  due_date: string | null
  file_name: string
}

interface Alert {
  key: string
  type: "overdue" | "due-soon" | "all-clear"
  docLabel: string
  docType: string
  dueDate: string | null
  daysUntil: number
}

const DOC_LABELS: Record<string, string> = {
  gstr2b: "GSTR-2B",
  gstr1: "GSTR-1",
  gstr3b: "GSTR-3B",
  gstr9: "GSTR-9",
  reg_cert: "GST Registration Certificate",
  challan: "PMT-06 Challan",
}

// Monthly docs with their due-day-of-next-month
const MONTHLY_DUE_DAYS: Record<string, number> = {
  gstr2b: 14,
  gstr1: 11,
  gstr3b: 20,
}

function getDueDateThisMonth(dayOfNextMonth: number): string {
  const now = new Date()
  const due = new Date(now.getFullYear(), now.getMonth() + 1, dayOfNextMonth)
  return due.toISOString().split("T")[0]
}

function daysUntilDate(dateStr: string): number {
  const due = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
}

function getStorageKey(key: string) {
  // Store dismissed keys with month prefix so alerts reset each month
  const now = new Date()
  const prefix = `${now.getFullYear()}-${now.getMonth() + 1}`
  return `gst-alert-dismissed-${prefix}-${key}`
}

export function GSTAlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load dismissed keys from localStorage
    const stored: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith("gst-alert-dismissed-")) stored.push(k)
    }
    setDismissed(new Set(stored.map((k) => k.replace(/gst-alert-dismissed-\d+-\d+-/, ""))))
  }, [])

  useEffect(() => {
    async function fetchAndCompute() {
      setLoading(true)
      try {
        const res = await fetch("/api/gst/documents")
        const docs: GSTDoc[] = await res.json()

        const computed: Alert[] = []
        const currentPeriod = (() => {
          const now = new Date()
          return `${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}`
        })()

        // Check each monthly doc
        for (const [docType, dueDay] of Object.entries(MONTHLY_DUE_DAYS)) {
          const dueDate = getDueDateThisMonth(dueDay)
          const days = daysUntilDate(dueDate)
          const uploaded = docs.some(
            (d) => d.doc_type === docType && d.status === "uploaded" && d.period === currentPeriod
          )
          if (!uploaded) {
            computed.push({
              key: `${docType}-${currentPeriod}`,
              type: days <= 0 ? "overdue" : days <= 7 ? "due-soon" : "pending" as any,
              docLabel: DOC_LABELS[docType] || docType,
              docType,
              dueDate,
              daysUntil: days,
            })
          }
        }

        // Check registration certificate (one-time)
        const hasRegCert = docs.some((d) => d.doc_type === "reg_cert" && d.status === "uploaded")
        if (!hasRegCert) {
          computed.push({
            key: "reg_cert-missing",
            type: "due-soon" as const,
            docLabel: "GST Registration Certificate",
            docType: "reg_cert",
            dueDate: null,
            daysUntil: 999,
          })
        }

        // Filter to only overdue and due-soon (suppress plain "pending" ones far away)
        setAlerts(computed.filter((a) => a.type === "overdue" || a.type === "due-soon"))
      } catch {
        setAlerts([])
      } finally {
        setLoading(false)
      }
    }
    fetchAndCompute()
  }, [])

  const dismiss = (key: string) => {
    localStorage.setItem(getStorageKey(key), "1")
    setDismissed((prev) => new Set([...prev, key]))
  }

  const visible = alerts.filter((a) => !dismissed.has(a.key))
  const overdueAlerts = visible.filter((a) => a.type === "overdue")
  const dueSoonAlerts = visible.filter((a) => a.type === "due-soon")

  if (loading) return null

  // All clear state
  if (visible.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/50">
        <CardContent className="flex items-center gap-3 py-4 px-5">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            All GST documents are up to date for this period.
          </p>
          <Link href="/dashboard/gst-report#checklist" className="ml-auto shrink-0">
            <Button variant="outline" size="sm" className="text-xs border-green-300 dark:border-green-700">
              View Checklist <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {/* Overdue alerts */}
      {overdueAlerts.map((alert) => (
        <Card key={alert.key} className="border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/50">
          <CardContent className="flex items-start gap-3 py-3 px-5">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                  {alert.docLabel} is overdue
                </p>
                <Badge variant="destructive" className="text-xs">
                  Overdue by {Math.abs(alert.daysUntil)} day{Math.abs(alert.daysUntil) !== 1 ? "s" : ""}
                </Badge>
              </div>
              {alert.dueDate && (
                <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                  Was due {fmtDate(alert.dueDate)} — upload as soon as possible to stay compliant
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <a href="#gst-checklist">
                <Button size="sm" variant="destructive" className="text-xs h-7">
                  Upload Now <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </a>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => dismiss(alert.key)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Due-soon alerts */}
      {dueSoonAlerts.map((alert) => (
        <Card key={alert.key} className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50">
          <CardContent className="flex items-start gap-3 py-3 px-5">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  {alert.docLabel}
                  {alert.dueDate ? ` due ${fmtDate(alert.dueDate)}` : " not uploaded"}
                </p>
                {alert.dueDate && alert.daysUntil > 0 && alert.daysUntil < 999 && (
                  <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                    {alert.daysUntil} day{alert.daysUntil !== 1 ? "s" : ""} left
                  </Badge>
                )}
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                {alert.dueDate
                  ? "Download from gst.gov.in and upload it below before the due date."
                  : "This is a one-time document — download from gst.gov.in → My Profile → Registration Certificate."}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <a href="#gst-checklist">
                <Button size="sm" variant="outline" className="text-xs h-7 border-amber-300 dark:border-amber-700">
                  Upload <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </a>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" onClick={() => dismiss(alert.key)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
