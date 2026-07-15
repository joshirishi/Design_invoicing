---
title: UX Story Gate Session — Dashboard and New Invoice
tags: design, ux, wireframe, component
---

# Design Session — Dashboard & New Invoice (Jul 10, 2026)

## Design-critic composite (Arjun/Meera/Priya/Zara)

Ran against Dashboard (`app/dashboard/page.tsx`) and New Invoice
(`components/invoice-form.tsx`). **Composite: 14/20 → REVISE.**

- Arjun (UX): 3.5/5 — Usable/Findable/Accessible all graded C. Client select has no inline
  "+ Add client" (breaks flow for first-time clients); sidebar is 12 flat items with no grouping;
  delete-row icon button has no `aria-label` (WCAG 4.1.2).
- Meera (Business): 3/5 — invoice creation itself won't move retention, it's table-stakes for the
  category. The real retention hook is the monthly reconciliation/GST ritual, currently buried at
  equal nav weight with everything else. Confirmed later by USER-STORIES.md: recurring invoices
  (US-40) and payment reminders (US-42) — the actual retention hooks — are backlog, not built.
- Priya (Feasibility): 4/5 — form itself is lean (S×S effort). Real risk found:
  `app/dashboard/layout.tsx` crashes locally when Supabase env is unset even though
  `middleware.ts` has an explicit dev-mode bypass — the two auth gates disagree.
- Zara (Delight): 3/5 — the only unclaimed "peak moment" in the whole flow is the transition after
  clicking "Create Invoice" (currently just "Creating…" then a silent redirect). Proposed: ~600ms
  confirmation beat before redirect.

## Field Veto Pass — items flagged, not yet resolved

From `components/invoice-form.tsx`: **Service Date** and **Terms & Conditions** textarea have no
task owner in the confirmed story set (❌ Cut/Justify). **Update, Jul 10 later session:** Terms &
Conditions is plausibly justified by US-08 (GST-compliant invoice) since payment terms are
standard on Indian tax invoices — but this hasn't been explicitly confirmed with the user.
**Active-template banner** was flagged ⚠️ Clarify at gate time — now resolved: it's real,
deliberate work from the canvas-editor sessions (Jun 20–25), not an orphaned field. Don't re-flag
it without checking Architecture-Audit / Sprint history first.

## Scale & states — still open

Dashboard has no defined loading skeleton (blocking SSR only), no defined error state beyond the
"tables missing" case, and no defined edge-state behavior at high transaction volume for its
charts. New Invoice form has a single generic error slot instead of field-level errors, and no
defined behavior for the zero-clients-exist case (empty dropdown, no guidance). None of these
have been resolved as of this note — they should still surface as gaps in any Arjun/Anuj pass on
these two screens until explicitly addressed.
