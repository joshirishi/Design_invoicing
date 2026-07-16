# InvoiceFlow — User Stories

> **Who is the user?** Rishikesh — an Indian freelancer/small business owner who wants an
> **intelligent CA in software form**: something that doesn't just raise invoices, but dissects
> every transaction, reconciles it against the bank, and keeps his books in a state a real
> accountant could close and file from — without hiring one for day-to-day work. The CA is only
> needed at filing time, and even then should receive filing-ready output, not raw statements.
>
> This is a stricter bar than "invoicing app with a GST tab." It means: every rupee that moves is
> categorized and posted to a real ledger (not just visible in a list), reconciliation is not just
> matching but *dissecting* ambiguous transactions down to a defensible category, and GST/TDS
> output is filing-shaped, not just report-shaped. See [[knowledge-bank/Personas/Noor-IA-Analysis]]
> — Critical Issue 1 (no double-entry foundation) is the single biggest gap between what's built
> and what "intelligent CA" requires.
>
> **Product direction:** Rishikesh is the first/reference user, but the stated goal is an agentic
> CA for **MSME business owners** generally — each with their own employees or contractors to pay,
> their own mix of business and personal accounts, and their own investments. Epics 17–19 below
> exist because a single real user's financial life already exceeds "one business bank account and
> one set of invoices": he runs a company (business current account), pays a household helper
> (personal UPI transfers that show up as unexplained reconciliation noise today — see
> [[knowledge-bank/Home]]), and holds a demat/trading account whose statements a CA currently
> collects by hand. Treat that as the existence proof for what any MSME owner's books actually
> look like, not an edge case.

---

## Epic 1: Onboarding & Auth

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-01 | Sign in with my Google account | I can access my data securely from any device | ✅ Built |
| US-02 | Complete an onboarding form with my business name, GSTIN, and bank details | My invoices are pre-filled with my correct details | ✅ Built |
| US-03 | Only allow my own email to access the app | No one else can view or edit my financial data | ✅ Built (superseded by Epic 19 — real multi-tenant auth) |

---

## Epic 2: Client Management

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-04 | Add a new client with name, email, phone, address, and GSTIN | I can quickly select them when creating an invoice | ✅ Built |
| US-05 | View a list of all my clients | I can manage and find clients easily | ✅ Built |
| US-06 | Edit or delete a client record | I can keep my client data accurate | ✅ Built |
| US-07 | See all invoices linked to a client | I can track my relationship and outstanding dues per client | 🔲 Not yet |

---

## Epic 3: Invoice Creation & Management

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-08 | Create a GST invoice with line items, HSN codes, CGST/SGST breakdown | My invoices are tax-compliant for Indian GST | ✅ Built |
| US-09 | Auto-calculate total, tax, and due amount when I add line items | I don't need to do manual maths | ✅ Built |
| US-10 | Set a due date on each invoice | I know when payments are expected | ✅ Built |
| US-11 | View all invoices with their status (Draft / Sent / Paid / Overdue) | I can track what's pending at a glance | ✅ Built |
| US-12 | Edit a draft invoice | I can fix mistakes before sending | ✅ Built |
| US-13 | Mark an invoice as sent | I know it has been delivered to the client | ✅ Built |
| US-14 | Download or print an invoice as a PDF | I can share it with clients or keep a paper record | ✅ Built |
| US-15 | See overdue invoices flagged clearly | I know which clients to follow up with | ✅ Built |

---

## Epic 4: Payment Recording

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-16 | Record a payment against an invoice (amount, date, mode) | The invoice status updates to Paid automatically | ✅ Built |
| US-17 | Record partial payments | I can track when a client pays in installments | ✅ Built |
| US-18 | View all payments in a list with date, amount, and linked invoice | I have a full payment history | ✅ Built |

---

## Epic 5: Bank Reconciliation & Dissection

> Reframed from plain "reconciliation" — the actual bar is *dissecting* messy real-world bank
> descriptions down to a defensible category, not just matching credits to invoices. See
> [[knowledge-bank/Technical/Architecture-Audit]] — this is the most-developed pipeline in the app
> (upload → signal extraction → rule/AI categorize → reconciliation suggestions), proven on 1,250
> real transactions at 76% auto-categorization.

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-19 | Upload my bank statement (CSV/XLS/PDF) | The app can match bank credits to my invoices | ✅ Built |
| US-20 | See unmatched bank transactions highlighted | I can quickly identify payments not yet recorded | ✅ Built |
| US-21 | Manually match a bank transaction to an invoice/payment | I can reconcile edge cases the auto-match misses | ✅ Built |
| US-22 | See a reconciliation summary (matched vs unmatched) | I know how in-sync my books are with my bank | ✅ Built |
| US-46 | Have transactions auto-categorized to a chart-of-accounts ledger account, not just tagged as income/expense | My books are ready for a trial balance, not just a spending list | ✅ Built (rule engine + AI fallback, `lib/categorize.ts` / `lib/ai-categorize.ts`) |
| US-47 | Get auto-generated, editable invoice/purchase drafts from unmatched transactions | I don't have to manually re-enter what the bank already told me | ✅ Built (`lib/reconcile-engine.ts`) |
| US-48 | Correct a mis-categorized transaction once and have the system learn the rule | I don't have to fix the same category mistake every month | ✅ Built (`learnFromCorrection()`) |
| US-49 | Search and bulk-accept reconciliation suggestions at real scale (100s–1000s of rows) | A monthly reconciliation of a full statement doesn't mean clicking Accept hundreds of times | ✅ Built (added in P0 story-gate fixes, Jul 13) |

---

## Epic 6: GST & Tax Reports

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-23 | View a GST report broken down by month | I can prepare my GSTR-1 filing | ✅ Built |
| US-24 | See total output CGST, SGST, and IGST collected | I know exactly how much GST to pay | ✅ Built (IGST-exclusion correctness bug fixed Jul 13) |
| US-25 | Export GST report data | I can share it with my CA or file it myself | ⚠️ Partial — raw export only, see US-53 |
| US-26 | Track purchase/input tax credit (ITC) from vendor invoices | I can offset my GST liability | ✅ Built |

---

## Epic 7: Purchases & Vendors

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-27 | Add vendor records with GSTIN and contact details | I can track who I buy from | ✅ Built |
| US-28 | Record purchase invoices from vendors | I can claim input tax credit (ITC) | ✅ Built |
| US-29 | View all purchase transactions | I have a full expense history | ✅ Built |

---

## Epic 8: Ledger & Account Summary

> ⚠️ **Caveat that matters under the "intelligent CA" bar:** both stories below are *derived
> views* computed on the fly from invoices/payments/purchases — not reads from a persisted
> double-entry ledger. There is still no `journal_entries` table. A CA cannot produce a trial
> balance or Balance Sheet from this. See Epic 12.

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-30 | See a full ledger of all credits and debits | I have a P&L-style view of my business | ⚠️ Built, but derived — not a real ledger (see Epic 12) |
| US-31 | See an account summary with total revenue, expenses, and net | I know my financial position at a glance | ⚠️ Built, but derived — not a real ledger (see Epic 12) |

---

## Epic 9: Tally Export

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-32 | Export my invoices and payments in Tally-compatible format | My accountant can import them directly into Tally | ⚠️ Built, not independently verified against a real Tally import (see [[knowledge-bank/Technical/Sprint-Roadmap]]) |

---

## Epic 10: Dashboard

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-33 | See a revenue chart for the current and past months | I can spot trends in my earnings | ✅ Built |
| US-34 | See a breakdown of invoices by status (Paid, Pending, Overdue) | I know the health of my receivables at a glance | ✅ Built |
| US-35 | See overdue invoice alerts on the dashboard | I'm reminded to follow up without digging through lists | ✅ Built |

---

## Epic 11: Settings & Profile

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-36 | Update my business name, address, GSTIN, and logo | My invoices always reflect the latest info | ✅ Built |
| US-37 | Update my bank account details | Correct payment info appears on invoices | ✅ Built |
| US-38 | Change my default GST rate or invoice prefix | My invoices match my business preferences | ✅ Built |

---

## Epic 12: Double-Entry Ledger (Journal Entries)

> **The single biggest gap between what's built and "intelligent CA."** Per
> [[knowledge-bank/Personas/Noor-IA-Analysis]] Critical Issue 1: the data model today is
> `Invoice → Payment → BankTransaction`, which is single-entry bookkeeping. Chart of Accounts
> (Epic 8) and Tally export (Epic 9) both exist but compute debit/credit at export/view time by
> reading invoices/payments/purchases directly — nothing is ever posted to a persisted journal.
> This is the fix that turns "records transactions" into "keeps books."

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-50 | Have every invoice, payment, and purchase automatically post a balanced journal entry (Dr/Cr) to a real ledger | My books reflect actual double-entry accounting, not a reconstruction at export time | 🔲 Not built |
| US-51 | Manually book a journal entry for something that isn't an invoice/payment/purchase (e.g. depreciation, accruals, contra entries) | I can record the transactions a CA books directly, not just the ones the app auto-generates | 🔲 Not built |
| US-52 | See a trial balance that sums to zero across all accounts | I know my books are internally consistent before handing off to my CA | 🔲 Not built |

---

## Epic 13: GST Filing Readiness

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-53 | Export a structured GSTR-1 (outward supply) report — B2B invoices grouped by client GSTIN, with HSN, tax, and place-of-supply — ready to paste into the GST portal | I don't have to manually re-shape my invoice data for filing | 🔲 Not built (Sprint 4, scoped Jul 1, never started; underlying IGST/place-of-supply/HSN data exists since Sprint 1) |
| US-54 | Reconcile my purchase-side ITC claims against GSTR-2B data | I don't over- or under-claim input credit | 🔲 Not built |

---

## Epic 14: TDS Tracking

> `tds_amount` / `tds_section` fields exist on `payments` since Sprint 1 and already feed the
> Tally receipt-voucher export, but there is no dedicated module, report, or reconciliation. This
> only covers TDS *deducted from the user* by clients — Epic 18 covers the mirror-image case of
> TDS the user must deduct when paying employees/contractors.

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-55 | See a report of all TDS deducted on payments received, by section | I know what to reconcile against Form 26AS at filing time | 🔲 Not built |
| US-56 | Get flagged when a client's TDS deduction doesn't match the expected rate for the payment type | I catch under/over-deduction before it becomes a filing discrepancy | 🔲 Not built |

---

## Epic 15: Financial Statements

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-57 | Generate a Profit & Loss statement for a selected period/financial year | I know my real profitability, not just revenue minus visible expenses | 🔲 Not built |
| US-58 | Generate a Balance Sheet (Assets / Liabilities / Equity) | I can see my business's financial position the way a CA or bank would ask for it | 🔲 Not built (blocked on Epic 12 — no ledger to derive it from) |
| US-62 | See a personal-ITR-readiness summary that combines business P&L, employee/contractor compensation, and capital gains (Epic 17) under the right ITR schedules | My CA gets one coherent picture at filing time instead of three disconnected exports | 🔲 Not built — depends on Epics 12, 17, and 18 |

---

## Epic 16: CA Collaboration Mode

> Persona B (CA) from [[knowledge-bank/PRD/00-PRD-Overview]] — not a current user, but the audit
> lens every architectural gap was found through ("could a CA produce a Balance Sheet from this
> data? No."). This epic is what turns the CA from an audit persona into an actual second user at
> filing time.

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-59 | Give my CA a read-only, filtered view of my books for a chosen period | They can review and flag discrepancies without me exporting files back and forth | 🔲 Not built — depends on Epic 19 (no second-user concept exists yet) |
| US-60 | Have my CA leave notes/queries against specific entries | Discrepancies get resolved in-context instead of over email | 🔲 Not built |
| US-61 | See a full audit trail of edits to any invoice, payment, or journal entry | I (or my CA) can trust that historical records weren't silently altered | 🔲 Not built |

---

## Epic 17: Multi-Account & Investment Statement Ingestion

> Confirmed green-field: `bank_transactions` has no `account_id`/`account_type`, and the only bank
> account on record is a single free-text set of fields on `profiles` (one business bank account,
> full stop). The `base documents/` folder already contains real, currently-unused sample data for
> this exact gap — `holdings-QO5154.xlsx`, `tradebook-QO5154-EQ.xlsx`,
> `taxpnl-QO5154-2025_2026-Q1-Q4.xlsx`, and two credit-card statements — proof this is a real
> monthly task today, done by hand. Scope decision: don't reconstruct capital-gains math (FIFO
> lots, grandfathering, equity vs F&O vs debt) from raw trades — ingest the broker's own STCG/LTCG
> "Tax P&L" export as source of truth and reconcile around it, the same way the app already trusts
> a bank statement's own numbers rather than recomputing running balances from scratch.

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-63 | Add multiple named bank accounts (e.g. "Business Current — HDFC", "Personal Savings — ICICI") instead of the single implicit account today | I can keep statements from different accounts separate instead of them pooling into one undifferentiated list | 🔲 Not built |
| US-64 | Tag each bank statement upload to a specific account | Transactions are traceable to the account they actually happened in | 🔲 Not built (depends on US-63) |
| US-65 | Mark an account as personal or business at the account level | Personal-account transactions are segregated from GST/business P&L by default, not guessed at per-transaction | 🔲 Not built — extends the existing "personal P2P transfer" categorization already noted in [[knowledge-bank/Home]] (household-helper UPI transfers) |
| US-66 | Upload a demat/broker statement or the broker's own Tax P&L (STCG/LTCG) export | My investment activity is captured without me re-deriving capital gains by hand | 🔲 Not built |
| US-67 | See a capital-gains summary (STCG/LTCG) per financial year, kept as its own ledger head separate from business Chart of Accounts | My CA gets a clean capital-gains figure under the correct ITR schedule, not mixed into business revenue | 🔲 Not built (depends on US-66) |
| US-68 | Reconcile a broker payout landing in my bank account against the corresponding capital-gains entry | A "money came in" bank credit is traceably linked to why, instead of showing up as unexplained reconciliation noise | 🔲 Not built (depends on US-63–US-67; reuses the matching pattern from Epic 5) |

---

## Epic 18: Employee & Contractor Payments

> Confirmed green-field: no `employees` table, no payroll logic, and no *outbound* TDS tracking
> exist anywhere in the schema or code today — only *inbound* TDS (deducted from the user by
> clients, Epic 14) is modeled. Phased so contractor tracking (structurally close to the existing
> `vendors` pattern) ships before the heavier formal-payroll build.

**Phase A — Contractor / freelancer payments**

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-69 | Add a payee record (name, PAN, payee type: employee or contractor) | I can track who I pay for services, distinct from vendors I buy goods/services from | ✅ Built (`/dashboard/payees`, `components/payees-view.tsx`) |
| US-70 | Record a payment to a contractor/freelancer with TDS deducted under the correct section (194J professional services / 194C contract work) | I'm compliant on the *outbound* TDS I'm responsible for deducting, not just tracking TDS deducted from me | ✅ Built — inline 194J/194C guidance, live-computed net payable, posts to the ledger via `postPayeePaymentJournalEntry` |
| US-71 | Generate Form 16A-ready data per contractor per quarter | I can issue TDS certificates without manually compiling payment history | ⚠️ Partial — quarterly TDS summary + CSV export built; the actual Form 16A statutory PDF template is a separate follow-up story (Priya's feasibility scope cut) |

**Phase B — Formal payroll**

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-72 | Record a monthly salary payment to an employee with PF/ESI/professional-tax deductions and TDS u/s 192 | My payroll compliance is tracked the same rigor as client-side GST/TDS | 🔲 Not built (depends on US-69) |
| US-73 | Generate a salary register and Form 16-ready annual data per employee | Year-end filing for staff doesn't mean reconstructing 12 months of payslips by hand | 🔲 Not built (depends on US-72) |
| US-74 | See total employee/contractor compensation as its own Chart-of-Accounts expense head, feeding the P&L correctly | Payroll spend shows up as a real ledgered expense, not as unexplained bank-reconciliation noise (the household-helper UPI pattern in [[knowledge-bank/Home]] is a live example of this exact gap today) | 🔲 Not built (depends on Epic 12 for real P&L, US-69–US-72) |

---

## Epic 19: Multi-Tenant SaaS Foundation

> The DB schema already has genuine multi-tenant plumbing — `organizations` → `org_members`,
> `org_id` FK on every table. The application layer doesn't use it: `lib/check-auth.ts` hardcodes
> a single `ALLOWED_EMAIL`, and `lib/get-org.ts` always resolves to `SELECT id FROM organizations
> ORDER BY id LIMIT 1` (with its own `TODO (Phase 3 auth)` comment marking this exact gap). This
> epic is what turns "single-tenant app with multi-tenant tables" into an actual product multiple
> MSME owners can sign up for independently.

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-75 | Sign up as a new business owner and get my own `organizations` row created automatically | I'm not blocked by an app hardcoded to one person's email | 🔲 Not built |
| US-76 | Have my session resolve to *my* org specifically, not always the first org in the table | My data and any other tenant's data can never cross-contaminate by construction | 🔲 Not built — fixes the `ORDER BY id LIMIT 1` placeholder in `lib/get-org.ts` directly |
| US-77 | Invite a teammate or my CA into my org with a defined role | Collaboration doesn't require sharing my own login | 🔲 Not built (uses the existing `org_members` table) |
| US-78 | Be guaranteed that no API route can return another org's data, even by accident | Multi-tenant isolation is enforced, not just assumed because every table happens to carry `org_id` | 🔲 Not built — needs an explicit audit of every API route's query scoping, not just schema review |
| US-79 | (Stretch — needs a business decision before scoping further) Have a per-org plan/billing model | The product can actually be sold to more than one MSME owner | 🔲 Not scoped — pricing/plan structure undecided |

---

## Backlog — Retention & Growth (secondary to the CA-grade gap above)

> Per the Jul 10 design-critic session (`[[knowledge-bank/Design/UX-Story-Gate-Session]]`), Meera
> flagged that invoice creation alone won't move retention — these two are the actual retention
> hooks, but they sit behind the CA-grade epics above in priority because they don't move the core
> "can this replace an accountant for day-to-day work" value prop.

| ID | Story | Priority |
|---|---|---|
| US-39 | Email invoices directly to clients from the app | High |
| US-42 | Automated payment reminders by email/WhatsApp | High |
| US-40 | Set up recurring invoices for retainer clients | Medium |
| US-41 | Client portal — clients can view and download their invoices | Medium |
| US-44 | Per-client invoice history page | Medium |
| US-43 | Multi-currency support for international clients | Low |
| US-45 | Expense categories and tagging for purchases | Low |

---

*Last updated: July 16, 2026 — Epic 12 (double-entry ledger) and Epic 18 Phase A
(contractor/freelancer payments) shipped; USER-STORIES.md originally reframed July 15, 2026
around the "intelligent CA for MSME business owners" product bar (dissect → reconcile →
filing-ready), Epics 12–19 added (double-entry ledger, GST filing readiness, TDS tracking,
financial statements, CA collaboration mode, multi-account & investment ingestion,
employee/contractor payments, multi-tenant SaaS foundation), Epic 8/9 status caveats added to
flag derived-view vs real-ledger gap.*
