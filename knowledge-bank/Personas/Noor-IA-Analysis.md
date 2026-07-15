---
title: Noor IA Analysis
tags: design, ux, architecture, ia
---

# Noor — IA Audit: CA Accounting Platform (Jul 1, 2026)

Full findings from the session that reset the product roadmap. Every design persona should treat
this as the baseline architectural context, not just design-system-agnostic principles.

## Module grades at time of audit

| Module | Built? | Grade | Notes |
|---|---|---|---|
| Invoicing (outward sales) | Yes | A | Line items, HSN, CGST/SGST, PDF — solid |
| Client management | Yes | B+ | Missing PAN, missing state code for IGST determination (fixed Sprint 1) |
| Payment recording | Yes | B | Linked to invoices. Missing TDS deduction field (fixed Sprint 1) |
| Bank reconciliation | Yes | B+ | Upload + match + auto-categorize — ahead of curve even then |
| Purchase bills (inward) | Yes | B | CGST/SGST/IGST fields exist. Missing vendor ledger (fixed Sprint 2) |
| GST Report | Partial | C+ | Output side only. No GSTR-1 format, no GSTR-2A match — still true |
| Account Summary | Partial | C | Derived view, not a real ledger — see Critical Issue 1 |
| Tally Import/Export | Missing | — | Stated goal. Fixed Sprint 3 |
| Chart of Accounts | Missing | — | Fundamental gap. Fixed Sprint 2 |
| Journal Entries | Missing | — | Double-entry foundation missing. **Still missing as of Jul 10.** |
| TDS module | Missing | — | Critical for Indian business. Fields added Sprint 1; no module/report. |
| P&L / Balance Sheet | Missing | — | No financial statements. Still missing. |
| Financial Year (Apr–Mar) | Missing | — | Schema had no FY concept. Fixed Sprint 1. |
| Vendor master | Missing | — | Purchases existed but no vendor entity. Fixed Sprint 2. |

## Critical Issue 1 — No double-entry foundation

The data model was (and largely still is):

```
Invoice → Payment → BankTransaction
```

This is single-entry bookkeeping — it only records money received, not the full accounting
picture. A CA cannot produce a Balance Sheet from this. The fix requires a `journal_entries`
table mirroring what Tally itself uses:

```
Every invoice  → DR: Accounts Receivable, CR: Revenue
Every payment  → DR: Bank, CR: Accounts Receivable
Every purchase → DR: Expense/Asset, CR: Accounts Payable
```

Sprints 1–3 built the *surface* a CA would expect (Chart of Accounts, Tally export, IGST/FY
logic) without building this underlying ledger. The Tally XML export works by reading invoices/
payments/purchases directly and computing debit/credit entries at export time — it does not read
from a persisted journal. This is worth flagging to Priya on any future feature that assumes a
real ledger exists.

## Verdict at the time

Two personas, 11 confirmed tasks, 7 of them P0 (IGST, FY, TDS, Tally export, journals, P&L,
GSTR-1). Sprint 1 was scoped as pure schema-and-logic — "minimal UI" — specifically because it
addressed data-accuracy P0s (IGST/FY) without needing new screens.

## What actually shipped vs what was promised

Sprints 1–3 shipped in full (see Sprint-Roadmap). Sprints 4 (GSTR-1 structured export) and 5
(TDS module) were offered at the end of the session and never started in any subsequent session.
Journal entries — the actual root-cause fix for Critical Issue 1 — were never revisited at all.
