// Indian financial year runs April 1 – March 31.
// Given a date string (YYYY-MM-DD) or Date, returns e.g. "2025-26".
export function getFinancialYear(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  const month = d.getMonth() + 1 // 1-based
  const year = d.getFullYear()
  const startYear = month >= 4 ? year : year - 1
  const endYear = startYear + 1
  return `${startYear}-${String(endYear).slice(-2)}`
}

// Returns true if the two 2-digit state codes indicate inter-state supply (IGST applies).
// Pass null/undefined for either → treated as same state (no IGST).
export function isInterState(
  sellerStateCode: string | null | undefined,
  buyerStateCode: string | null | undefined,
): boolean {
  if (!sellerStateCode || !buyerStateCode) return false
  return sellerStateCode.trim() !== buyerStateCode.trim()
}

// Indian state codes for the dropdown
export const INDIAN_STATES: { code: string; name: string }[] = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "25", name: "Daman & Diu" },
  { code: "26", name: "Dadra & Nagar Haveli" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh (old)" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
]
