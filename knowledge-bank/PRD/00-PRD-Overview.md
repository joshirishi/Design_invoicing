---
title: PRD Overview
tags: prd, product
---

# InvoiceFlow — PRD Overview

## Vision

A solo Indian freelancer/small business owner should be able to run their entire financial
life — invoicing, payment tracking, bank reconciliation, GST compliance, and handoff to Tally
for their CA — without hiring an accountant for day-to-day work. The CA is only needed at
filing time, and even then should receive Tally-ready exports instead of raw statements.

## Personas (confirmed, from the Noor IA audit)

### Persona A — Business Owner (Rishikesh)
Day-to-day operator. Runs his own company. Session frequency: daily/weekly for invoicing and
payments, monthly for reconciliation and GST checks.

```
DAY-TO-DAY
1. Raise invoice → send to client
2. Record payment received
3. Upload bank statement monthly
4. Add purchase bills (vendor invoices)

MONTHLY CHECK-IN
5. "How much do I owe in GST this month?"
6. "Who hasn't paid me yet?"
7. "What's my cash in hand vs receivables?"

YEAR-END
8. Hand files to CA for ITR
9. Export to Tally for audit
```

### Persona B — CA (Chartered Accountant)
Not a current user of the live product, but the audit persona — every architectural gap was
found by asking "could a CA produce a Balance Sheet from this data?" (Answer at audit time: no.)

```
MONTHLY CYCLE
1. Collect vouchers / bills from client
2. Book entries (purchase, expense, contra, journal)
3. Bank reconciliation (match entries to bank statement)
4. TDS working (deductions made / received)
5. GST working → GSTR-1 (outward) + GSTR-3B (summary)
6. Month-end trial balance check

QUARTERLY CYCLE
7. Advance tax computation + payment tracking
8. GSTR-9 (annual) preparation

YEAR-END
9. Final P&L + Balance Sheet
10. ITR filing working
11. Audit trail export
```

## Tally strategy

Tally is the exit ramp, not a competitor to replace. The product's job is to capture clean,
correctly-tagged data all year, then produce a Tally-importable XML on demand — not to become a
full accounting suite itself. This shaped the Sprint 2/3 decision to seed a Tally-compatible
Chart of Accounts rather than invent a proprietary ledger taxonomy.

## Scope decisions worth remembering

- **Real GST portal API was evaluated and deliberately rejected for now.** GSP (GST Suvidha
  Provider) registration has real cost and approval friction. The product instead helps users
  download/upload/track the documents the government portal already produces, with a checklist
  and deadline alerts. Mock-mode GST API remains for local dev/testing.
- **AI provider is Gemini Flash, routed through Vercel AI Gateway** — not direct Google API keys,
  by explicit user preference ("keep using gemini flash for all requirements"). Direct
  `GOOGLE_GENERATIVE_AI_API_KEY` was tried first for OCR and silently failed; switching to the
  Gateway string model id (`"google/gemini-2.5-flash"`) fixed it. Any new AI feature should default
  to the Gateway pattern, not a direct provider SDK.
- **Bank categorization scope was explicitly "full vision"** — not just categorize-and-file, but
  auto-generate *editable, reviewable* invoice/purchase suggestions from unmatched transactions.
  User was explicit that auto-created records must stay editable before commit, never silently
  finalized.
- **Single-tenant by design.** `ALLOWED_EMAIL` gate in `lib/check-auth.ts` restricts the whole app
  to one user. Multi-user support is out of scope until explicitly requested.
