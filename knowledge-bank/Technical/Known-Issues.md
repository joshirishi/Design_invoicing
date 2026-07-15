---
title: Known Issues
tags: tech, constraint, infrastructure
---

# Known Issues & Fragile Areas

Recurring problems across sessions — useful for Priya (feasibility risk) and Arjun (error-state
credibility) to cite directly instead of guessing at what's fragile.

## AI Gateway rate limits (Gemini Flash via Vercel AI Gateway)

Free tier hit 429s repeatedly during the Jul 6 backfill of 1,250 transactions. Behavior observed:
- Parallel batches (4 concurrent) immediately triggered rate limiting.
- Sequential calls work but are slow (~5-15s per batch of 40 signals).
- The limit appears to be an hourly rolling window — cleared within 2-3 hours of exhaustion.
- Error surfaces as a generic message; no documented reset-time header was found.
**Implication:** any new AI-categorization or OCR feature using this Gateway key will hit the
same wall under bulk/backfill-style usage. Design for it explicitly (queue + resume, not a single
blocking call) rather than assuming synchronous success.

## `pdf-parse` library bug

Invoice OCR upload for PDFs threw `ENOENT: no such file or directory, open
'./test/data/05-versions-space.pdf'` — a known upstream issue where `pdf-parse` tries to load its
own bundled test fixture on init in certain environments. Not a bug in this codebase's own logic.

## Gemini model/env mismatches

`GOOGLE_GENERATIVE_AI_API_KEY` was never actually set; the OCR route and later the categorization
code both assumed it was. Failures were **silent** (no error surfaced clearly) until traced back
to env config. Switching both routes to Vercel AI Gateway string model IDs
(`"google/gemini-2.5-flash"`) fixed it and is now the standard pattern — do not reintroduce direct
`@ai-sdk/google` provider calls without confirming the env var is actually set.

## Bank statement upload — "0 new transactions, N duplicates skipped"

Recurring failure mode across several sessions, root causes varied each time: a missing unique/
exclusion constraint for `ON CONFLICT`, a `sql is not defined` reference error, and the
leading-newline SQL bug (see Architecture-Audit) all separately produced this exact same
user-visible symptom. **If this error recurs, don't assume it's the same root cause as last
time — check the specific query path first.**

## Invoice template save — 500 errors

The canvas-based template editor (`/api/invoice-templates`) had a period of repeated 500s on
save, traced to Supabase storage/schema issues during the Sprint that also moved data off Neon.
Confirm the Supabase table + storage bucket exist before assuming template save "just works."

## Branding bleed from a shared auth app

Supabase auth pages (signup/confirmation) briefly showed branding/URIs from a different product
("echo") because the Supabase auth redirect URLs were shared/generic rather than
InvoiceFlow-specific. If auth screens ever look wrong, check the Supabase Auth URL configuration
before assuming a code bug.

## Duplicate GST document types have real, specific deadlines

Not a bug, but a fact worth encoding for Arjun/Zara on any GST-surface work — the six tracked
document types and their real-world monthly deadlines:

| Doc | Due date |
|---|---|
| GSTR-2B | 14th of next month |
| GSTR-1 | 11th of next month |
| GSTR-3B | 20th of next month |
| GSTR-9 | 31 Dec of next FY (annual) |
| Registration Certificate | one-time |
| PMT-06 Challan | after each payment |

## Vercel deployment email goes to a specific address

Deployment notification emails go to whatever email the Vercel account owner used to sign up
(`rishikesh.joshi@onlinesales.ai`), not necessarily the product's own domain identity — configurable
under Vercel account settings if it becomes a problem, not a bug.
