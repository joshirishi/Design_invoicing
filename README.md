# InvoiceFlow — GST Invoicing for Indian Freelancers

A production-ready invoicing and GST management system built for Indian freelancers and small businesses.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/analyzthis24-6990s-projects/v0-design-invoicing)

---

## What It Does

| Feature | Description |
|---|---|
| **Invoices** | Create GST-aware invoices with CGST/SGST, HSN codes, and due dates |
| **Clients** | Manage client records with GSTIN |
| **Payments** | Record payments against invoices |
| **Bank Reconciliation** | Upload bank statements and match them to payments |
| **GST Reports** | Track output GST and export reports |
| **PDF Export** | Print or save any invoice as a PDF |
| **Dashboard** | Revenue charts, invoice status breakdown, overdue alerts |

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** Neon Serverless Postgres
- **Auth:** Stack Auth (Google sign-in)
- **UI:** Tailwind CSS v4 + shadcn/ui
- **Charts:** Recharts

---

## Setup

### 1. Environment variables

Create a `.env.local` file in the root with:

```env
# Neon Postgres
DATABASE_URL=your_neon_connection_string

# Stack Auth — get from https://app.stack-auth.com
NEXT_PUBLIC_STACK_PROJECT_ID=your_project_id
STACK_SECRET_SERVER_KEY=your_secret_key
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_key

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Initialise the database

Start the dev server, then visit:

```
http://localhost:3000/api/init-db
```

This creates all tables with the correct schema. **Warning: this drops and recreates all tables.**

### 4. (Optional) Seed with demo data

```
http://localhost:3000/api/import-figma-data
```

### 5. Run locally

```bash
pnpm dev
```

---

## Database Schema

The canonical schema lives in `lib/types.ts`. Key tables:

- `profiles` — your business info, bank details, GST credentials
- `clients` — client records with GSTIN
- `invoices` — GST invoices with CGST/SGST breakdown
- `payments` — payments recorded against invoices
- `bank_transactions` — uploaded bank statement entries

---

## Auth

Access is restricted to a single allowed email (`joshi.rishikesh@gmail.com`). This is enforced in:
- `lib/check-auth.ts` — server-side check on every dashboard page
- `app/dashboard/layout.tsx` — layout-level auth guard

To change the allowed email, update `ALLOWED_EMAIL` in `lib/check-auth.ts`.

---

## Deployment

Deployed on Vercel. Add all `.env.local` variables to the Vercel project environment variables.
