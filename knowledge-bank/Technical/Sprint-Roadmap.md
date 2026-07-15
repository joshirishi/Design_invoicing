---
title: Sprint Roadmap
tags: tech, architecture, roadmap
---

# Sprint Roadmap

## Sprint 1 — Data Accuracy (shipped, Jul 1)

- `invoices`: added `igst_rate`, `igst_amount`, `financial_year`, `place_of_supply`
- `invoice_line_items`: added `igst_rate`, `igst_amount`
- `clients`: added `state_code`, `pan_no` (GSTIN auto-fills state code from first 2 digits)
- `profiles`: added `state_code` (the reference point for IGST vs CGST/SGST comparison)
- `payments`: added `tds_amount`, `tds_section`
- `purchases`, `bank_transactions`: added `financial_year`
- `lib/financial-year.ts` — `getFinancialYear()`, `isInterState()`, all 38 Indian state codes
- `invoice-form.tsx` — live "IGST (Inter-state)" / "CGST + SGST (Intra-state)" badge, tax
  computed correctly for both cases automatically

## Sprint 2 — Chart of Accounts + Vendor Master (shipped, Jul 1)

- `chart_of_accounts` table — 46 accounts seeded, Tally-group-mapped (Sales, Indirect Expenses,
  Duties & Taxes, etc.), supports `parent_id` for tree nesting
- `vendors` table — GSTIN, PAN, state code
- `purchases.vendor_id` FK, `bank_transactions.ledger_id` FK
- `/dashboard/vendors` — card grid, add/edit dialog, GSTIN auto-fills state
- `/dashboard/ledger` (Chart of Accounts) — grouped by type, system defaults locked, custom
  accounts addable
- Purchases form — vendor dropdown auto-fills name/GSTIN when vendor exists in master

## Sprint 3 — Tally XML Export (shipped, Jul 1)

- `lib/tally-xml.ts` — debit = negative amount, credit = positive amount, every voucher balances
  to zero, handles CGST+SGST and IGST, handles TDS-deducted receipts (splits bank debit from TDS
  receivable debit), XML-escapes all text
- Three voucher types: Sales (Dr. Sundry Debtors → Cr. Service Income + Output GST), Purchase
  (Dr. Direct Purchases + Input ITC → Cr. Sundry Creditors), Receipt (Dr. Bank + TDS Receivable →
  Cr. Sundry Debtors)
- `/dashboard/tally-export` — FY selector, per-voucher-type toggle, live preview, one-click
  download, in-page Tally import instructions

**Not independently verified against a real Tally import** — built and shipped in the same
session with a clean build, but no confirmation loop with actual Tally software exists in the
transcripts.

## Sprint 4 — GSTR-1 structured export (never started)

Offered at the end of the Jul 1 session. Never picked up in any later session. The raw data
(IGST, place-of-supply, HSN) has existed since Sprint 1 — only the GSTR-1-shaped export view is
missing.

## Sprint 5 — TDS module (never started)

`tds_amount` / `tds_section` fields exist on `payments` since Sprint 1 and are used in the Tally
receipt-voucher export, but there's no TDS report, no TDS reconciliation, no dedicated module.

## Unplanned work that happened instead (Jul 2 – Jul 9)

Sprints 4/5 didn't happen because attention moved to three unplanned but higher-urgency threads:

1. **GST integration reality check (Jul 2)** — found the "real" GST API mode was silently calling
   mock methods under the hood, wrong base URL, and missing the actual 2-step OTP auth flow the
   government portal requires. Fixed the API client for real (mock mode kept working
   unchanged), then pivoted to a document-upload + checklist + deadline-alert system since real
   GSP registration has real cost/friction (see PRD Overview).
2. **Bank auto-categorization + reconciliation suggestions (Jul 6)** — the biggest single
   feature since Sprint 3. See Architecture-Audit for full detail.
3. **Duplicate invoice detection on OCR scan (Jul 6, same day)** — when scanning an invoice via
   OCR, instantly checks if that invoice number already exists; amber warning + forced
   "Save Anyway" override if the user wants a second copy anyway.

## What Priya should flag on any future sprint planning

The pattern across every sprint so far: schema/logic-only sprints (1, 3) shipped clean in a
single session; UI-heavy or third-party-integration sprints (GST OTP flow, bank categorization)
ran into real operational walls — rate limits, silent env-var mismatches, SQL bugs — that ate
multiple sessions to fully resolve. Size UI/integration work accordingly, not by lines of code.
