"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { fetchFromAPI } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { CheckCircle2, XCircle, Loader2, RefreshCw, TestTube } from "lucide-react"

export function GSTCredentialsForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [integrated, setIntegrated] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [useMockAPI, setUseMockAPI] = useState(true)

  const [formData, setFormData] = useState({
    gstin: "",
    username: "",
    apiKey: "",
  })

  useEffect(() => {
    loadCredentials()
  }, [])

  const loadCredentials = async () => {
    try {
      const data = await fetchFromAPI("/api/gst/credentials")
      setFormData({
        gstin: data.gstin || "",
        username: data.username || "",
        apiKey: "", // Never show API key
      })
      setIntegrated(data.integrated)
      setLastSync(data.lastSync)
      setUseMockAPI(data.useMockAPI !== false) // Default to true
    } catch (err) {
      console.error("Failed to load GST credentials:", err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await fetchFromAPI("/api/gst/credentials", {
        method: "POST",
        body: JSON.stringify({ ...formData, useMockAPI }),
      })

      setSuccess(true)
      setIntegrated(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save credentials")
    } finally {
      setIsLoading(false)
    }
  }

  const testConnection = async () => {
    setIsTesting(true)
    setError(null)

    try {
      const result = await fetchFromAPI("/api/gst/credentials", {
        method: "PUT",
      })

      if (result.success) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.message || "Connection test failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection test failed")
    } finally {
      setIsTesting(false)
    }
  }

  const syncNow = async () => {
    setIsSyncing(true)
    setError(null)

    try {
      const today = new Date()
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(today.getDate() - 30)

      await fetchFromAPI("/api/gst/sync", {
        method: "POST",
        body: JSON.stringify({
          syncType: "cash_ledger",
          fromDate: thirtyDaysAgo.toISOString().split("T")[0],
          toDate: today.toISOString().split("T")[0],
          useMockAPI,
        }),
      })

      setSuccess(true)
      setLastSync(new Date().toISOString())
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>GST Integration</CardTitle>
            <CardDescription>Connect to GST portal for automatic data sync</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {integrated ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" />
                Not Connected
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <TestTube className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="mock-mode" className="text-base">
                Use Mock Data (Testing Mode)
              </Label>
              <p className="text-xs text-muted-foreground">Test GST features without real credentials</p>
            </div>
          </div>
          <Switch id="mock-mode" checked={useMockAPI} onCheckedChange={setUseMockAPI} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gstin">GSTIN</Label>
            <Input
              id="gstin"
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
              placeholder={useMockAPI ? "27AGSPJ2168A1ZF (Mock)" : "27AGSPJ2168A1ZF"}
              maxLength={15}
              required={!useMockAPI}
              disabled={useMockAPI}
            />
            <p className="text-xs text-muted-foreground">
              {useMockAPI ? "Mock GSTIN used for testing" : "Your 15-digit GST Identification Number"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">GST Portal Username</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder={useMockAPI ? "test.user@example.com (Mock)" : "your.email@example.com"}
              required={!useMockAPI}
              disabled={useMockAPI}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              placeholder={useMockAPI ? "Not required for mock mode" : "Enter your GST API key"}
              required={!useMockAPI && !integrated}
              disabled={useMockAPI}
            />
            <p className="text-xs text-muted-foreground">
              {useMockAPI
                ? "API key not needed in mock mode"
                : "Enable API access in GST portal → My Profile → Manage API Access"}
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {success && <p className="text-sm text-green-600 dark:text-green-400">Operation successful!</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading || isTesting}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Credentials"
              )}
            </Button>

            {integrated && (
              <>
                <Button type="button" variant="outline" onClick={testConnection} disabled={isTesting || isLoading}>
                  {isTesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>

                <Button type="button" variant="outline" onClick={syncNow} disabled={isSyncing || isLoading}>
                  {isSyncing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync Now
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </form>

        {lastSync && (
          <p className="text-xs text-muted-foreground">
            Last synced: {new Date(lastSync).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
          </p>
        )}

        {!useMockAPI && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">How to get API access</h4>
            <ol className="mt-2 space-y-1 text-xs text-blue-800 dark:text-blue-200">
              <li>1. Log in to the GST portal (gst.gov.in)</li>
              <li>2. Go to My Profile → Manage API Access</li>
              <li>3. Click "Yes" and select duration (6 hours to 30 days)</li>
              <li>4. Copy the API key and paste it above</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
