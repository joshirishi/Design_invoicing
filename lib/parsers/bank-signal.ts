// Bank description "signal" extraction.
//
// Real ICICI-style descriptions are delimited by "/" (most banks) or "-" (NEFT/RTGS),
// with the merchant/payee-identifying token sitting at a DIFFERENT segment index
// depending on the transaction-type prefix — not a fixed "3rd or 4th slash" rule.
// Verified against a real statement (base documents/OpTransactionHistory19-06-2026.xls):
//
//   UPI/paytmqr6a4bqq@p/Icecream/YES BANK LIMITE/.../...        → segment 2  ("Icecream")
//   VIN/UBER INDIA /202504011016/509004545452/                  → segment 1  ("UBER INDIA")
//   BIL/001007555791/ICICI BANK CREDIT CA/431581331468          → segment 2  ("ICICI BANK CREDIT CA")
//   GIB/002041084700/GST       /25042700645109                  → segment 2  ("GST")
//   ATM/S1CNR877/CASH WDL/10-05-25                               → segment 2  ("CASH WDL")
//   NFS/CASH WDL/517516022401/.../PUNE/...                       → segment 1  ("CASH WDL")
//   ACH/BAJAJ FINANCE LIMITE/6935288                             → segment 1  ("BAJAJ FINANCE LIMITE")
//   VSI/FACEBOOK   /202506121145/516206857331/                   → segment 1  ("FACEBOOK")
//   MMT/IMPS/512611869959/razorpayBankAcc/PERFIOS SO/IDFC bank   → segment 3-4
//   NEFT-HDFCN52025040866562713-JOULESTOWATTS BUSINESS SOLUTIONS PV-...  → "-" delimited, segment 2
//   RTGS-HDFCR52025051671291990-INDIAN CLEARING CORPORATION LIMITED-...  → "-" delimited, segment 2
//
// When the prefix is unrecognized, or the extracted segment is empty/purely numeric/
// too short to be meaningful, we fall back to matching against the whole description.

export interface SignalResult {
  prefix: string | null   // the transaction-type prefix, e.g. "UPI", "NEFT" — null if none detected
  signal: string          // the extracted merchant/note text, or the whole description on fallback
  isFallback: boolean     // true when `signal` is the whole description (no clean segment extracted)
}

// prefix → index of the meaningful "/"-delimited segment
const SLASH_SEGMENT_INDEX: Record<string, number> = {
  UPI: 2,
  VIN: 1,
  BIL: 2,
  GIB: 2,
  ATM: 2,
  NFS: 1,
  ACH: 1,
  VSI: 1,
  INF: 4,  // INF/INFT/<ref>/<payer-name>/<payer-company>/...
}

// prefix → index of the meaningful "-"-delimited segment
const DASH_SEGMENT_INDEX: Record<string, number> = {
  NEFT: 2,
  RTGS: 2,
}

function isMeaningful(segment: string | undefined): segment is string {
  if (!segment) return false
  const trimmed = segment.trim()
  if (trimmed.length < 2) return false
  if (/^\d+$/.test(trimmed)) return false // pure reference/UTR numbers carry no category signal
  return true
}

export function extractSignal(description: string | null | undefined): SignalResult {
  const trimmed = (description ?? "").trim()
  if (!trimmed) return { prefix: null, signal: "", isFallback: true }

  // Dash-delimited: NEFT-..., RTGS-...
  for (const [prefix, idx] of Object.entries(DASH_SEGMENT_INDEX)) {
    if (trimmed.toUpperCase().startsWith(`${prefix}-`)) {
      const parts = trimmed.split("-")
      const seg = parts[idx]
      return isMeaningful(seg)
        ? { prefix, signal: seg.trim(), isFallback: false }
        : { prefix, signal: trimmed, isFallback: true }
    }
  }

  // Slash-delimited: UPI/..., VIN/..., BIL/..., etc.
  const slashParts = trimmed.split("/")
  if (slashParts.length > 1) {
    const prefix = slashParts[0].trim().toUpperCase()

    // MMT/IMPS/<ref>/<name>/<merchant>/<bank> — try segment 3, then 4
    if (prefix === "MMT" && slashParts[1]?.trim().toUpperCase() === "IMPS") {
      for (const idx of [3, 4]) {
        const seg = slashParts[idx]
        if (isMeaningful(seg) && !/bank/i.test(seg)) {
          return { prefix: "MMT/IMPS", signal: seg.trim(), isFallback: false }
        }
      }
      return { prefix: "MMT/IMPS", signal: trimmed, isFallback: true }
    }

    const idx = SLASH_SEGMENT_INDEX[prefix]
    if (idx !== undefined) {
      const seg = slashParts[idx]
      // UPI special case: if segment 1 is purely numeric (Apple / Google / some fintech UPIs use
      // UPI/<ref>/<note>/<vpa>/... format), the meaningful merchant is at segment 3 not 2.
      if (prefix === "UPI" && /^\d+$/.test(slashParts[1]?.trim() ?? "")) {
        const vpa = slashParts[3]?.trim() ?? ""  // e.g. "appleservices.b" or personal VPA
        return isMeaningful(vpa) && !/@/.test(vpa)   // skip personal VPAs (they contain @)
          ? { prefix, signal: vpa, isFallback: false }
          : { prefix, signal: trimmed, isFallback: true }
      }
      return isMeaningful(seg)
        ? { prefix, signal: seg.trim(), isFallback: false }
        : { prefix, signal: trimmed, isFallback: true }
    }

    // Recognized-looking prefix (short alpha code) but no mapping — still record it
    // for future tuning, but fall back to matching the whole description.
    if (/^[A-Z]{2,5}$/.test(prefix)) {
      return { prefix, signal: trimmed, isFallback: true }
    }
  }

  return { prefix: null, signal: trimmed, isFallback: true }
}

// Normalizes text for keyword/regex matching — lowercase, strip separators, collapse whitespace.
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\/\-_|@#]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}
