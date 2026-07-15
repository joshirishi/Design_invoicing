---
title: InvoiceFlow Knowledge Bank
tags: product, prd
---

# InvoiceFlow — Knowledge Bank

Reconstructed from `cursor_sessions/` transcripts (Jun 20 – Jul 9, 2026) and the live codebase.
This is the project brain every design persona (Arjun, Meera, Priya, Zara, Noor, Anuj, Raj) and
`/ux-story-gate` should read before evaluating anything in this repo.

## What this actually is

Not just invoicing software — a bootstrapped **double-entry accounting platform** for a solo
Indian freelancer/consultant with no accountant. Started as GST-aware invoicing, then a
CA-perspective audit (see [[Noor-IA-Analysis]]) reframed the whole roadmap around real
bookkeeping: Chart of Accounts, Tally export, financial-year logic, TDS, GST compliance.

## Map

- [[00-PRD-Overview]] — vision, personas, scope
- [[01-Task-Map]] — the 11 confirmed tasks (Owner + CA) with DONE WHEN / FAILS WHEN
- [[Noor-IA-Analysis]] — the CA-perspective audit that reset the roadmap (Jul 1, 2026)
- [[Architecture-Audit]] — schema state, what's real vs mocked, per-module grades
- [[Sprint-Roadmap]] — Sprint 1–3 shipped, Sprint 4–5 never started
- [[Known-Issues]] — recurring bugs and fragile areas, by module
- [[UX-Story-Gate-Session]] — the field-veto + routing pass on Dashboard/New-Invoice

## Who is the user

Rishikesh — solo freelancer/consultant, single-tenant (`ALLOWED_EMAIL` gate in
`lib/check-auth.ts`), no accountant on staff. Runs his own company (OSX TECHLABS) and pays a
household helper (recurring personal UPI transfers) — both show up as real transaction noise in
his own bank statements, which is why the bank-categorization work below cares about "personal
P2P transfer" as its own class, not just business income/expense.

## Where the product has been (chronological)

1. **Jun 20** — Existing InvoiceFlow codebase audited, feature roadmap agreed, Supabase wired up
   for auth (moved off Neon-only), full finance reconciliation engine planned and built
   (multi-file bank statement upload: CSV/XLS/PDF).
2. **Jun 20–25** — Canvas-based invoice template editor built: drag-drop field placement on an
   uploaded background PNG, Google Fonts, Pantone colors, 12 Figma templates imported.
3. **Jun 25** — Sidebar-vanishing bug root-caused and fixed (`DashboardLayout` moved into
   `app/dashboard/layout.tsx` so every dashboard route gets it automatically — this is why the
   current layout looks the way it does).
4. **Jun 26** — The Cursor persona package (this `cursor-design-personas/` folder) built, renamed
   to `analyzthis_design`, published to npm, made installable across Cursor/Claude/Codex.
5. **Jul 1** — Noor IA audit: reframed the product as a CA-grade accounting platform, missing a
   double-entry foundation entirely. Sprint 1–3 planned and shipped same session (IGST/FY logic,
   Chart of Accounts + Vendors, Tally XML export). Sprint 4 (GSTR-1) / Sprint 5 (TDS module) were
   offered but never started — see [[Sprint-Roadmap]].
6. **Jul 2** — GST integration audited against the real government API portal; found real GSP
   registration is costly/high-friction, so pivoted to a document-upload + checklist + deadline
   -notification system instead of live API integration.
7. **Jul 6** — Bank statement auto-categorization: rule engine + Gemini Flash AI fallback +
   editable tree UI + auto-generated invoice/purchase suggestions from unmatched transactions.
   76% auto-categorization rate achieved on 1,250 real transactions; the remaining 24% are
   genuinely ambiguous personal P2P transfers that even the AI correctly refuses to guess at.
8. **Jul 9** — `USER-STORIES.md` written retrospectively (38 stories, 11 epics, 7-item backlog).

## North-star, as far as it's been stated

Never written down explicitly as a metric. Closest signal: the landing page says "get paid
faster," but the actual behavior pattern across sessions is "stop needing an accountant for
day-to-day bookkeeping and only hand off at year-end." Meera should treat this as **unconfirmed —
ask before optimizing for either interpretation.**
