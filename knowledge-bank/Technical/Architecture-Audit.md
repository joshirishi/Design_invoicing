---
title: Architecture Audit
tags: tech, architecture, api, backend, infrastructure
---

# Architecture Audit

## Bank statement upload → categorize → reconcile pipeline (as of Jul 6)

Full pipeline, most-developed feature in the app:

- **Upload** (`components/bank-statement-upload.tsx` → `app/api/bank-statements/upload/route.ts`)
  — accepts CSV/XLS/XLSX/PDF, parsers in `lib/parsers/{csv,xls,pdf}-bank.ts` (currently
  ICICI-statement-format-tuned), dedupes on `(org_id, date, description, debit, credit)`, tags
  each batch with `upload_batch_id`.
- **Signal extraction** (`lib/parsers/bank-signal.ts`) — bank descriptions are not uniform.
  Prefix determines which `/`-delimited segment holds the meaningful merchant/note string:
  `UPI→segment 2`, `VIN→segment 1`, `BIL→segment 2`, `GIB→segment 2`, `MMT/IMPS→segments 3-4`,
  `ATM/NFS→segment 1-2`, `ACH→segment 1`. `NEFT-`/`RTGS-` use a `-` delimiter, not `/`, and don't
  fit the segment model at all. A single "count N slashes" rule does not hold across real data —
  this had to be reverse-engineered from actual statement exports.
- **Rule-based categorization** (`lib/categorize.ts`) — regex rules first, then keyword rules,
  sorted by priority, resolves to a `chart_account_id`. Self-learning: user corrections via
  `components/category-badge.tsx` call `learnFromCorrection()`, which extracts the
  most-*repeated* unique token (not just the longest) and saves it as a new rule in
  `category_rules`, scoped to the org.
- **AI fallback** (`lib/ai-categorize.ts`) — Gemini Flash via **Vercel AI Gateway** (not direct
  Google SDK — that path is broken/unconfigured), batches of 40 signals, `generateObject` with
  confidence scores. Threshold tuned down from 50% to **35%** after testing showed Gemini was
  correctly refusing to guess above 50% on legitimately ambiguous inputs (see Known-Issues).
- **Reconciliation suggestions** (`lib/reconcile-engine.ts` → `generateReconciliationSuggestions()`,
  `app/api/reconciliation-suggestions/route.ts`, `components/suggestions-tab.tsx`) — for
  categorized-but-unmatched transactions, generates an *editable* draft invoice or purchase.
  Accepting one calls the real `/api/invoices` or `/api/purchases` POST handlers internally
  (constructed `NextRequest`, not a fetch — avoids duplicating client-resolution/GST-calc logic),
  then links and reconciles the bank transaction. Dismissing sets status rather than deleting, so
  a unique constraint on `bank_transaction_id` prevents re-suggesting after dismissal.

**Result on real data (1,250 transactions, one upload):** 76% auto-categorized (679 by keyword
rules, 267 by Gemini, 4 by regex). The remaining 24% are personal P2P UPI transfers with
one-word sender notes ("Hairdo", "Gas pipe", "Book") — genuinely unrecoverable without human
context, and the system correctly leaves them uncategorized rather than guessing.

## GST integration — mock vs real

`lib/gst-api.ts` supports both modes via a `useMockAPI` flag:
- **Mock mode** — fully functional, used for local dev/testing without real GSP credentials.
- **Real mode** — was completely fake until Jul 2 (all methods silently called mock functions
  internally, wrong base URL). Fixed to call actual endpoints (`/authenticate`,
  `/authenticate/otp`, `/ledger/cash`, `/returns/gstr1`, `/returns/gstr3b`) with the real 2-step
  OTP flow the government portal requires. **Still requires GSP registration
  (`GST_APP_KEY`/`GST_CLIENT_ID`) that the user has not obtained** — real mode is
  built-and-correct but unused in practice. The product's actual GST workflow for the user today
  is the document checklist/upload/alerts system, not the live API.

## Auth architecture

- Single-tenant, gated by `ALLOWED_EMAIL` in `lib/check-auth.ts`.
- Supabase Google OAuth. `middleware.ts` has an explicit dev-mode bypass when Supabase env vars
  are unset; `app/dashboard/layout.tsx`'s `createServerComponentClient()` does **not** have the
  same bypass — this mismatch was found directly during the Jul 10 local dev setup (crashes
  locally without real Supabase creds even though middleware says it shouldn't).
- Sidebar-vanishing bug (Jun 25): root cause was `DashboardLayout` being imported per-page instead
  of once in the root layout — some pages (Account Summary, Invoice Templates) simply forgot to
  include it. Fixed by moving it into `app/dashboard/layout.tsx` once, wrapping every route
  automatically. This is why the *current* layout architecture centralizes it there — don't
  reintroduce per-page sidebar imports.

## Known recurring code-quality bug: leading-newline SQL

Multiple `rawSql`/`exec_sql` template literals across the codebase silently returned empty
results when the SQL string started with a newline right after the backtick (affects SELECT/
RETURNING output capture specifically, not plain INSERTs without RETURNING). Found and fixed in
`purchases/route.ts`, `clients/route.ts`, `vendors/route.ts` during the Jul 6 session — but this
is a footgun pattern, not a one-time bug. **Any new `rawSql` call should be written as a single
line immediately after the opening backtick**, or explicitly checked for this failure mode.

## Chart of Accounts vs. real ledger

The Chart of Accounts (Sprint 2) and Tally export (Sprint 3) both exist, but there is still no
`journal_entries` table — confirmed absent from the schema as of Jul 10. Tally XML export
computes debit/credit entries at export time by reading invoices/payments/purchases directly, not
from a persisted double-entry ledger. See Noor-IA-Analysis, Critical Issue 1 — this is still open.
