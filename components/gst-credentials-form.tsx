"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { fetchFromAPI } from "@/lib/fetch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  CheckCircle2, XCircle, Loader2, RefreshCw, TestTube,
  Smartphone, ShieldCheck, AlertCircle, ExternalLink, Info,
} from "lucide-react"

type ConnectStep = "credentials" | "otp" | "done"

export function GSTCredentialsForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [integrated, setIntegrated] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [useMockAPI, setUseMockAPI] = useState(true)

  // 2-step connect state (real mode only)
  const [connectStep, setConnectStep] = useState<ConnectStep>("credentials")
  const [refId, setRefId] = useState<string | null>(null)
  const [otp, setOtp] = useState("")

  const [formData, setFormData] = useState({ gstin: "", username: "" })

  useEffect(() => {
    loadCredentials()
  }, [])

  const loadCredentials = async () => {
    try {
      const data = await fetchFromAPI("/api/gst/credentials")
      setFormData({ gstin: data.gstin || "", username: data.username || "" })
      setIntegrated(data.integrated)
      setLastSync(data.lastSync)
    } catch {
      // Profile may not exist yet — ignore
    }
  }

  // ── Step 1: Submit GSTIN + username (or mock connect) ────────────────────────
  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await fetchFromAPI("/api/gst/credentials", {
        method: "POST",
        body: JSON.stringify({ ...formData, useMockAPI }),
      })

      if (useMockAPI) {
        // Mock mode: done in one step
        setIntegrated(true)
        setConnectStep("done")
        setSuccess("Mock GST connected successfully. Your GST data is ready to sync.")
      } else if (result.otpRequired) {
        // Real mode: move to OTP entry step
        setRefId(result.refId)
        setConnectStep("otp")
        setSuccess("OTP sent to your GST-registered mobile number.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect")
    } finally {
      setIsLoading(false)
    }
  }

  // ── Step 2: Verify OTP (real mode only) ─────────────────────────────────────
  const handleOTPVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await fetchFromAPI("/api/gst/credentials", {
        method: "PATCH",
        body: JSON.stringify({ refId, otp }),
      })
      setIntegrated(true)
      setConnectStep("done")
      setSuccess("GST portal connected successfully!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed")
    } finally {
      setIsLoading(false)
    }
  }

  const testConnection = async () => {
    setIsTesting(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await fetchFromAPI("/api/gst/credentials", { method: "PUT" })
      if (result.success) {
        setSuccess("Connection test passed!")
        setTimeout(() => setSuccess(null), 3000)
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
    setSuccess(null)
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

      setSuccess("Sync complete!")
      setLastSync(new Date().toISOString())
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDisconnect = () => {
    setIntegrated(false)
    setConnectStep("credentials")
    setRefId(null)
    setOtp("")
    setSuccess(null)
    setError(null)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>GST Integration</CardTitle>
            <CardDescription>Connect to the GST portal to sync your tax data</CardDescription>
          </div>
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
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Mock mode toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <TestTube className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label htmlFor="mock-mode" className="text-base cursor-pointer">
                Use Mock Data (Testing Mode)
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Test all GST features without real credentials
              </p>
            </div>
          </div>
          <Switch
            id="mock-mode"
            checked={useMockAPI}
            onCheckedChange={(v) => {
              setUseMockAPI(v)
              setConnectStep("credentials")
              setError(null)
              setSuccess(null)
            }}
          />
        </div>

        {/* ── Real mode: GSP requirement notice ── */}
        {!useMockAPI && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                GSP Registration Required for Live Connection
              </p>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              Direct GST API access requires a <strong>GST_APP_KEY</strong> and <strong>GST_CLIENT_ID</strong> issued by
              GSTN to registered GST Suvidha Providers (GSPs). Without this, real-mode requests will fail.
              Use mock mode to try all features now, and configure your GSP keys in <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">.env.local</code> when ready for production.
            </p>
            <a
              href="https://developer.gst.gov.in/apiportal/taxpayer"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 underline"
            >
              GST Developer Portal <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* ── Already connected: show actions ── */}
        {integrated ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 p-4 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  {useMockAPI ? "Connected (Mock Mode)" : "Connected to GST Portal"}
                </p>
                {formData.gstin && (
                  <p className="text-xs text-green-700 dark:text-green-300 font-mono mt-0.5">{formData.gstin}</p>
                )}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {error}
              </p>
            )}
            {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={testConnection} disabled={isTesting || isSyncing}>
                {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Test Connection
              </Button>
              <Button variant="outline" onClick={syncNow} disabled={isSyncing || isTesting}>
                {isSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync Now
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-muted-foreground">
                Disconnect
              </Button>
            </div>

            {lastSync && (
              <p className="text-xs text-muted-foreground">
                Last synced: {new Date(lastSync).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
              </p>
            )}
          </div>

        ) : connectStep === "otp" ? (
          /* ── Step 2: OTP entry (real mode) ── */
          <form onSubmit={handleOTPVerify} className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 p-4 flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">OTP Sent</p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                  A 6-digit OTP was sent to the mobile number registered on the GST portal for{" "}
                  <span className="font-mono font-semibold">{formData.gstin}</span>.
                  It expires in 10 minutes.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="otp">Enter OTP</Label>
              <Input
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit OTP"
                inputMode="numeric"
                maxLength={6}
                required
                className="text-center text-xl tracking-widest font-mono"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading || otp.length !== 6}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Verify & Connect
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setConnectStep("credentials"); setError(null); setOtp("") }}
              >
                Back
              </Button>
            </div>
          </form>

        ) : (
          /* ── Step 1: GSTIN + username ── */
          <form onSubmit={handleStep1} className="space-y-4">
            {!useMockAPI && (
              <div className="rounded-lg border border-muted bg-muted/20 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-medium text-foreground">What you need</p>
                </div>
                <ul className="text-xs text-muted-foreground space-y-0.5 ml-6 list-disc">
                  <li>Your 15-digit GSTIN (e.g. 27AGSPJ2168A1ZF)</li>
                  <li>Username used to log in to gst.gov.in</li>
                  <li>Access to the mobile number registered on the GST portal (for OTP)</li>
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="gstin">GSTIN</Label>
              <Input
                id="gstin"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase().trim() })}
                placeholder={useMockAPI ? "27AGSPJ2168A1ZF (auto-filled in mock mode)" : "27AGSPJ2168A1ZF"}
                maxLength={15}
                required={!useMockAPI}
                disabled={useMockAPI}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {useMockAPI ? "Mock GSTIN is used automatically" : "Your 15-character GST Identification Number"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">GST Portal Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder={useMockAPI ? "Not required in mock mode" : "Username you use on gst.gov.in"}
                required={!useMockAPI}
                disabled={useMockAPI}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {error}
              </p>
            )}
            {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}

            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {useMockAPI ? "Connect with Mock Data" : "Send OTP"}
            </Button>

            {!useMockAPI && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 p-4">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Before you connect — enable API access on gst.gov.in
                </h4>
                <ol className="space-y-1 text-xs text-blue-800 dark:text-blue-200 list-decimal ml-4">
                  <li>Log in to <a href="https://www.gst.gov.in" target="_blank" rel="noopener noreferrer" className="underline">gst.gov.in</a></li>
                  <li>Go to <strong>My Profile → Manage API Access</strong></li>
                  <li>Click <strong>"Yes"</strong> and select a duration (up to 30 days)</li>
                  <li>Come back here and click "Send OTP"</li>
                </ol>
              </div>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  )
}
