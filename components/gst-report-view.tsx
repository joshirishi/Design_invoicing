"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fetchFromAPI } from "@/lib/db"
import { Calendar, TrendingUp, CheckCircle, AlertCircle } from "lucide-react"

interface GSTReport {
  outputGST: Array<{
    month: string
    total_gst_collected: string
    invoice_count: string
  }>
  reconciledPayments: Array<{
    month: string
    total_received: string
    gst_on_received: string
    payment_count: string
  }>
  summary: {
    totalOutputGST: number
    totalReconciledGST: number
    unreconciledGST: number
    reconciledPercentage: number
  }
}

export function GSTReportView() {
  const [report, setReport] = useState<GSTReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [startDate, setStartDate] = useState("2024-01-01")
  const [endDate, setEndDate] = useState("2025-12-31")

  const fetchReport = async () => {
    setIsLoading(true)
    try {
      const data = await fetchFromAPI(`/api/gst-report?startDate=${startDate}&endDate=${endDate}`)
      setReport(data)
    } catch (error) {
      console.error("Error fetching GST report:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [])

  if (isLoading) {
    return <div className="text-center py-8">Loading GST report...</div>
  }

  if (!report) {
    return <div className="text-center py-8">Failed to load GST report</div>
  }

  const formatCurrency = (value: string | number) => {
    return `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatMonth = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", { year: "numeric", month: "long" })
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button onClick={fetchReport}>Generate Report</Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total GST Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(report.summary.totalOutputGST)}</div>
            <p className="text-xs text-muted-foreground">Output GST on all invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GST on Received Payments</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(report.summary.totalReconciledGST)}</div>
            <p className="text-xs text-muted-foreground">From reconciled payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unreconciled GST</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(report.summary.unreconciledGST)}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment receipt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary.reconciledPercentage.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Of invoiced GST received</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>GST Collected by Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.outputGST.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data available</p>
              ) : (
                report.outputGST.map((row) => (
                  <div key={row.month} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <p className="font-medium">{formatMonth(row.month)}</p>
                      <p className="text-sm text-muted-foreground">{row.invoice_count} invoices</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(row.total_gst_collected)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reconciled GST by Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.reconciledPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reconciled payments yet</p>
              ) : (
                report.reconciledPayments.map((row) => (
                  <div key={row.month} className="flex items-center justify-between border-b pb-3">
                    <div>
                      <p className="font-medium">{formatMonth(row.month)}</p>
                      <p className="text-sm text-muted-foreground">{row.payment_count} payments</p>
                      <p className="text-xs text-muted-foreground">Total: {formatCurrency(row.total_received)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">{formatCurrency(row.gst_on_received)}</p>
                      <Badge variant="outline" className="mt-1">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Reconciled
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
