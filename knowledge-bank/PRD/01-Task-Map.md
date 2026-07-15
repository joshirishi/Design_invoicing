---
title: Task Map
tags: prd, user stories, done when, fails when
---

# InvoiceFlow — Confirmed Task Map

Source: Noor IA audit session (Jul 1, 2026) + `USER-STORIES.md` (canonical, Jul 9, 2026).
This is the task map `/ux-story-gate` should extract directly — it's already in the required
PERSONA / TASK / FREQUENCY / DONE WHEN / FAILS WHEN format.

## Persona A — Business Owner

```
TASK 1
PERSONA:    Business Owner
TASK:       Raise an invoice and send it to a client
FREQUENCY:  Weekly
DONE WHEN:  Invoice is created, PDF is generated, client receives it
FAILS WHEN: Tax calculation is wrong or client doesn't receive the email
STATUS:     Create/PDF built. Email send NOT built (US-39, backlog, High priority).

TASK 2
PERSONA:    Business Owner
TASK:       Record a payment received against an invoice
FREQUENCY:  Weekly
DONE WHEN:  Invoice status updates to paid / partially paid, amount is logged
FAILS WHEN: Payment is recorded but invoice still shows as unpaid
STATUS:     Built.

TASK 3
PERSONA:    Business Owner
TASK:       Upload bank statement and reconcile against payments
FREQUENCY:  Monthly
DONE WHEN:  All credits in the statement are matched to payments, unmatched items flagged
FAILS WHEN: Auto-match fails silently or matched entries are incorrect
STATUS:     Built, and extended well past this — see Architecture-Audit. 76% auto-categorization
            achieved on real data; remaining 24% are correctly flagged as ambiguous rather than
            silently guessed.

TASK 4
PERSONA:    Business Owner
TASK:       Add a vendor purchase bill
FREQUENCY:  Weekly
DONE WHEN:  Bill is logged with GST breakdown for input credit
FAILS WHEN: GST amounts are not captured correctly or vendor is not found
STATUS:     Built (Sprint 2 — vendor master + purchases form vendor autocomplete).

TASK 5
PERSONA:    Business Owner
TASK:       Check GST liability for the month
FREQUENCY:  Monthly
DONE WHEN:  Output GST minus input credit is displayed clearly with invoice-level detail
FAILS WHEN: Number shown doesn't match actual GSTR-3B obligation
STATUS:     Partial — output GST report exists, but no structured GSTR-1 export (Sprint 4, never
            started) and no verified reconciliation against actual GSTR-3B.

TASK 6
PERSONA:    Business Owner
TASK:       Export books to Tally (XML / structured file)
FREQUENCY:  Monthly or Quarterly
DONE WHEN:  Downloaded file imports into Tally without errors
FAILS WHEN: File format is wrong, data is incomplete, or Tally rejects the import
STATUS:     Built (Sprint 3). Not independently verified against a real Tally import by anyone
            other than the assistant who wrote it — flag as untested in production.
```

## Persona B — CA

```
TASK 7
PERSONA:    CA
TASK:       Review client's books and flag discrepancies
FREQUENCY:  Weekly
DONE WHEN:  CA can see all entries by date, type, and amount — and can add notes
FAILS WHEN: CA cannot distinguish their client's data from their own view
STATUS:     Not built. No CA-facing view or notes feature exists. Single-tenant app has no
            concept of a second user role at all.

TASK 8
PERSONA:    CA
TASK:       Prepare GSTR-1 (outward supply) report for filing
FREQUENCY:  Monthly
DONE WHEN:  B2B invoices are structured by GSTIN with HSN, tax, and place-of-supply — ready to
            paste into GST portal
FAILS WHEN: IGST is missing for inter-state invoices, or HSN codes are blank
STATUS:     Not built (Sprint 4, never started). IGST/place-of-supply data exists in the schema
            since Sprint 1, so the raw data is there — just no GSTR-1-shaped export.

TASK 9
PERSONA:    CA
TASK:       Book journal entries for expenses not captured as invoices
FREQUENCY:  Weekly
DONE WHEN:  Entry is recorded with debit/credit accounts, appears in trial balance
FAILS WHEN: No journal entry module exists — entry cannot be made at all
STATUS:     Not built. No `journal_entries` table exists anywhere in the schema (confirmed by
            direct grep of migrations, Jul 10). This is still the single biggest architectural
            gap Noor flagged — the app has Chart of Accounts and Tally export, but no actual
            double-entry ledger underneath either of them.
```

## Additional confirmed stories not in the original 11-task map (from `USER-STORIES.md`)

- **US-07** — Per-client invoice history page. Not built.
- **US-40, US-42** — Recurring invoices, automated payment reminders. Not built. These are the
  retention-hook gaps Meera flagged in the Jul 10 design-critic session — the invoice-creation
  loop alone won't move retention; these two would.
- **US-41** — Client portal (clients view/download their own invoices). Not built.
- **US-43, US-44, US-45** — Multi-currency, per-client history, expense tagging. Not built, lower
  priority per the backlog.

## Scale & states — still undeclared

Carried over from the Jul 10 `/ux-story-gate` session on Dashboard/New-Invoice — nobody has yet
specified expected invoice/transaction volume (10s/100s/1000s+) or whether list filters should
persist across sessions. The bank-reconciliation work processed **1,250 real transactions** in
one upload batch, which is a concrete existence proof that "scale" for this single-tenant app can
mean four-figure row counts within a single operation, not just steady daily growth.
