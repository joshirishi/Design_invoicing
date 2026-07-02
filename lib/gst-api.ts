// GST API Integration Module
// Real API targets: https://api.gst.gov.in/taxpayerapi/v1.0/
// Authentication is 2-step: initiate (triggers OTP) → verify OTP → get session token
// Requires GSP (GST Suvidha Provider) App Key set via GST_APP_KEY env variable

interface GSTCredentials {
  gstin: string
  username: string
  apiKey: string
}

export interface GSTAuthResponse {
  success: boolean
  token?: string
  error?: string
}

export interface GSTInitAuthResponse {
  success: boolean
  refId?: string
  error?: string
}

export interface GSTVerifyOTPResponse {
  success: boolean
  token?: string
  error?: string
}

interface GSTLedgerEntry {
  date: string
  description: string
  debitAmount: number
  creditAmount: number
  balance: number
  transactionId: string
  period: string
}

export class GSTAPIClient {
  private baseURL: string
  private credentials: GSTCredentials | null = null
  private authToken: string | null = null
  private useMockAPI: boolean

  constructor(useMockAPI = true) {
    this.useMockAPI = useMockAPI
    this.baseURL = process.env.GST_API_BASE_URL || "https://api.gst.gov.in/taxpayerapi/v1.0"
  }

  setCredentials(credentials: GSTCredentials) {
    this.credentials = credentials
  }

  // ─── Step 1: Initiate authentication — GST portal sends OTP to user's mobile ──
  async initiateAuth(gstin: string, username: string): Promise<GSTInitAuthResponse> {
    if (this.useMockAPI) {
      // Mock: skip OTP, return a fake refId immediately
      return { success: true, refId: `mock-ref-${Date.now()}` }
    }

    const appKey = process.env.GST_APP_KEY
    const clientId = process.env.GST_CLIENT_ID

    if (!appKey || !clientId) {
      return {
        success: false,
        error: "GST_APP_KEY and GST_CLIENT_ID environment variables are required for real GST API access. These are issued by GSTN to registered GST Suvidha Providers (GSPs).",
      }
    }

    try {
      const response = await fetch(`${this.baseURL}/authenticate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          clientid: clientId,
          "client-secret": appKey,
          action: "AUTHTOKEN",
        },
        body: JSON.stringify({
          action: "AUTHTOKEN",
          username,
          gstin,
        }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        return { success: false, error: data.error?.message || "OTP request failed" }
      }

      return { success: true, refId: data.data?.ref_id || data.ref_id }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to connect to GST portal",
      }
    }
  }

  // ─── Step 2: Verify OTP — returns session token ───────────────────────────────
  async verifyOTP(refId: string, otp: string): Promise<GSTVerifyOTPResponse> {
    if (this.useMockAPI || refId.startsWith("mock-ref-")) {
      // Mock: any 6-digit OTP passes
      if (otp.length === 6) {
        const token = `mock-session-${Date.now()}`
        this.authToken = token
        return { success: true, token }
      }
      return { success: false, error: "OTP must be 6 digits" }
    }

    const appKey = process.env.GST_APP_KEY
    const clientId = process.env.GST_CLIENT_ID

    if (!appKey || !clientId) {
      return { success: false, error: "GST_APP_KEY and GST_CLIENT_ID are not configured" }
    }

    try {
      const response = await fetch(`${this.baseURL}/authenticate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          clientid: clientId,
          "client-secret": appKey,
          action: "OTPTOKEN",
        },
        body: JSON.stringify({
          action: "OTPTOKEN",
          username: this.credentials?.username,
          app_key: appKey,
          rek: refId,
          otp,
        }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        return { success: false, error: data.error?.message || "OTP verification failed" }
      }

      const token = data.data?.auth_token || data.auth_token
      this.authToken = token
      return { success: true, token }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "OTP verification failed",
      }
    }
  }

  // ─── Authenticate with stored session token (for sync operations) ─────────────
  async authenticate(): Promise<GSTAuthResponse> {
    if (!this.credentials) {
      return { success: false, error: "Credentials not set" }
    }

    try {
      if (this.useMockAPI) {
        const response = await fetch("/api/gst/mock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "authenticate" }),
        })
        const data = await response.json()
        if (data.success && data.token) {
          this.authToken = data.token
        }
        return data
      }

      // Real mode: use stored API key as session token (set after OTP verification)
      if (this.credentials.apiKey) {
        this.authToken = this.credentials.apiKey
        return { success: true, token: this.credentials.apiKey }
      }

      return {
        success: false,
        error: "No session token found. Please reconnect via Settings → GST.",
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      }
    }
  }

  // ─── Fetch electronic cash ledger ─────────────────────────────────────────────
  async fetchCashLedger(fromDate: string, toDate: string): Promise<GSTLedgerEntry[]> {
    if (!this.authToken) {
      throw new Error("Not authenticated. Call authenticate() first.")
    }

    if (this.useMockAPI) {
      const response = await fetch("/api/gst/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cash_ledger", fromDate, toDate }),
      })
      const data = await response.json()
      return data.data
    }

    const clientId = process.env.GST_CLIENT_ID || ""
    const response = await fetch(
      `${this.baseURL}/ledger/cash?gstin=${this.credentials?.gstin}&fromDate=${fromDate}&toDate=${toDate}`,
      {
        headers: {
          "Content-Type": "application/json",
          clientid: clientId,
          "auth-token": this.authToken,
        },
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err?.error?.message || `Ledger fetch failed (${response.status})`)
    }

    const data = await response.json()
    // Normalize GST portal response format to our internal format
    return (data.data?.ledger || []).map((e: any) => ({
      date: e.dt,
      description: e.desc,
      debitAmount: Number(e.damt || 0),
      creditAmount: Number(e.camt || 0),
      balance: Number(e.bal || 0),
      transactionId: e.txid,
      period: e.rp,
    }))
  }

  // ─── Fetch GSTR-1 (outward supplies) ──────────────────────────────────────────
  async fetchGSTR1(period: string): Promise<any> {
    if (!this.authToken) {
      throw new Error("Not authenticated. Call authenticate() first.")
    }

    if (this.useMockAPI) {
      const response = await fetch("/api/gst/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "gstr1", period }),
      })
      const data = await response.json()
      return data.data
    }

    const clientId = process.env.GST_CLIENT_ID || ""
    const response = await fetch(
      `${this.baseURL}/returns/gstr1?gstin=${this.credentials?.gstin}&ret_period=${period}`,
      {
        headers: {
          "Content-Type": "application/json",
          clientid: clientId,
          "auth-token": this.authToken,
        },
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err?.error?.message || `GSTR-1 fetch failed (${response.status})`)
    }

    const data = await response.json()
    return data.data
  }

  // ─── Fetch GSTR-3B summary ────────────────────────────────────────────────────
  async fetchGSTR3B(period: string): Promise<any> {
    if (!this.authToken) {
      throw new Error("Not authenticated. Call authenticate() first.")
    }

    if (this.useMockAPI) {
      const response = await fetch("/api/gst/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "gstr3b", period }),
      })
      const data = await response.json()
      return data.data
    }

    const clientId = process.env.GST_CLIENT_ID || ""
    const response = await fetch(
      `${this.baseURL}/returns/gstr3b?gstin=${this.credentials?.gstin}&ret_period=${period}`,
      {
        headers: {
          "Content-Type": "application/json",
          clientid: clientId,
          "auth-token": this.authToken,
        },
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err?.error?.message || `GSTR-3B fetch failed (${response.status})`)
    }

    const data = await response.json()
    return data.data
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Validates the 15-character GSTIN format
// Structure: 2-digit state code + 10-char PAN + entity number + alphabet + checksum
export function validateGSTIN(gstin: string): boolean {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  return gstinRegex.test(gstin)
}

// Formats a JS Date into the MMYYYY period string the GST portal uses
export function formatGSTPeriod(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${month}${year}`
}
