# InvoiceFlow — User Stories

> **Who is the user?** Rishikesh — an Indian freelancer/small business owner who needs to manage GST invoicing, track payments, reconcile bank statements, and stay compliant with Indian tax rules — without an accountant.

---

## Epic 1: Onboarding & Auth

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-01 | Sign in with my Google account | I can access my data securely from any device | ✅ Built |
| US-02 | Complete an onboarding form with my business name, GSTIN, and bank details | My invoices are pre-filled with my correct details | ✅ Built |
| US-03 | Only allow my own email to access the app | No one else can view or edit my financial data | ✅ Built |

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

## Epic 5: Bank Reconciliation

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-19 | Upload my bank statement (XLS/CSV) | The app can match bank credits to my invoices | ✅ Built |
| US-20 | See unmatched bank transactions highlighted | I can quickly identify payments not yet recorded | ✅ Built |
| US-21 | Manually match a bank transaction to an invoice/payment | I can reconcile edge cases the auto-match misses | ✅ Built |
| US-22 | See a reconciliation summary (matched vs unmatched) | I know how in-sync my books are with my bank | ✅ Built |

---

## Epic 6: GST & Tax Reports

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-23 | View a GST report broken down by month | I can prepare my GSTR-1 filing | ✅ Built |
| US-24 | See total output CGST, SGST, and IGST collected | I know exactly how much GST to pay | ✅ Built |
| US-25 | Export GST report data | I can share it with my CA or file it myself | ✅ Built |
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

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-30 | See a full ledger of all credits and debits | I have a P&L-style view of my business | ✅ Built |
| US-31 | See an account summary with total revenue, expenses, and net | I know my financial position at a glance | ✅ Built |

---

## Epic 9: Tally Export

| ID | As a user, I want to… | So that… | Status |
|---|---|---|---|
| US-32 | Export my invoices and payments in Tally-compatible format | My accountant can import them directly into Tally | ✅ Built |

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

## Backlog (Not Yet Built)

| ID | Story | Priority |
|---|---|---|
| US-39 | Email invoices directly to clients from the app | High |
| US-40 | Set up recurring invoices for retainer clients | Medium |
| US-41 | Client portal — clients can view and download their invoices | Medium |
| US-42 | Automated payment reminders by email/WhatsApp | High |
| US-43 | Multi-currency support for international clients | Low |
| US-44 | Per-client invoice history page | Medium |
| US-45 | Expense categories and tagging for purchases | Low |

---

*Last updated: July 9, 2026*
