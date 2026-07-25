# Onboarding Email HTML Templates — Design Spec

**Date:** 2026-07-25
**Status:** Proposed
**Author:** Surya Prakash (via Claude)

## Context

[2026-07-22-resend-onboarding-emails-design.md](2026-07-22-resend-onboarding-emails-design.md) shipped `lib/resend.ts` sending three onboarding emails (Welcome, Reminder x3, Completion) as plain `<p>` tags — no branding, no layout. That spec already decided the sending mechanism deliberately avoids React Email or a Resend-dashboard-authored template ("keeps templates in version control, testable by mocking the `resend` package"). This spec designs the actual HTML/CSS for those emails, built from Paper mockups on the "Creative" page of the Talam Design file (header background, footer background, full Welcome-email template, and 5 logo explorations).

### Two bugs found and fixed while sourcing brand values from the live theme

1. **Wrong brand color in the Paper mockups.** The Paper file's `--color-brand-primary` token still held `#4f3ff0` (indigo) — stale. `app/globals.css` had already been repointed to `#c1502e` (rust/terracotta) in commit `eecb761`, a deliberate rebrand. The Paper mockups (header/footer backgrounds, logo explorations, full template) have been recolored to `#c1502e` to match; Paper and the live theme now agree.
2. **Wrong mailer domain in `lib/resend.ts`.** `FROM = hello@mail.${NEXT_PUBLIC_ROOT_DOMAIN ?? 'mytalam.com'}` uses the wrong subdomain prefix (`mail.` not `mailer.`) and a fallback domain (`mytalam.com`) inconsistent with `lib/tenant-url.ts`'s `talam4shop.com` fallback. Corrected to `hello@mailer.talam4shop.com`, used as both the `FROM` sender and the footer contact address.

## Architecture

New `lib/email-templates.ts` — pure presentation, no dependency on `resend`, Prisma, or Next.js request context (so it's trivially unit-testable as plain string-in/string-out functions):

```ts
export const EMAIL_BRAND = {
  primary: '#C1502E',      // app/globals.css --color-brand-primary
  primaryTint: '#E8A98D',  // link color on dark footer — a lighter mix of primary, not a separate token
  ink: '#18181B',          // --color-fg
  muted: '#8B7D7A',        // --color-muted-warm
  mutedBody: '#3F3F46',    // paragraph body text — darker than muted for readability at 15px
  surface: '#FFFFFF',      // --color-surface
  bg: '#F9F9F9',           // --color-bg
  bgDark: '#1A1A1A',       // --color-bg-dark (footer base, blended into a gradient)
  border: '#E8E8E8',       // --color-border
  address: '123 Residency Road, Bengaluru, India',
  contactEmail: 'hello@mailer.talam4shop.com',
} as const

export function renderEmailShell(bodyHtml: string): string
export function renderEmailBody(params: {
  greeting?: string
  heading?: string
  paragraphs: string[]
  list?: string[]
  ctas: { label: string; href: string }[]
  signature?: string
  extraHtml?: string
}): string
```

**Why one `renderEmailBody` instead of three per-email functions:** all three emails share the same content shape (optional greeting → optional heading → paragraphs → optional list → 1–2 CTA buttons → optional signature). Welcome uses greeting+heading+paragraph+1 CTA+signature; Reminder uses just a paragraph+1 CTA (no heading, no greeting); Completion uses a paragraph+list+2 CTAs, no signature. One flexible function serving all three avoids duplicating the shell-wrapping markup three times.

`lib/resend.ts` keeps owning copy (subjects, `REMINDER_COPY`, etc. — unchanged from the approved spec) and composes:
```ts
html: renderEmailShell(renderEmailBody({
  greeting: 'Hi there,',
  heading: "You're in! 3 minutes to a live store",
  paragraphs: ["Thanks for signing up for Talam. You're just a few steps away from a store customers can actually buy from — logo, first product, and how you want to get paid."],
  ctas: [{ label: 'Finish setup →', href: params.onboardingUrl }],
  signature: 'See you on the other side,<br/>The Talam Team',
}))
```
All dynamic values (`onboardingUrl`, `storeName`, `storeUrl`, `adminUrl`, per-reminder copy) flow in as plain function parameters, interpolated via JS template literals — the same pattern `lib/resend.ts` already uses today, no new templating syntax introduced.

### SRP / OCP

- **SRP:** `EMAIL_BRAND` (theme values), `renderEmailShell` (document chrome — header/footer), `renderEmailBody` (content composition) each have exactly one reason to change: a brand/contact update, a layout change, or a content-shape change, respectively. `lib/resend.ts` keeps owning copy + send/error-handling, per the already-approved spec.
- **OCP:** `renderEmailBody`'s params cover all 3 current emails without modifying the function. A future 4th onboarding email (e.g. a payment-setup nudge) calls it with new params — no existing template code touched. The one deliberate escape hatch is `extraHtml?: string`, appended after the list/paragraphs, so a future email needing a slightly different content block (e.g. an inline stat row) doesn't force a signature change either. No generic block registry or plugin system — YAGNI for 3 known call sites; the escape hatch is the cheapest form of "open for extension" available.

## Email-client safety

Built as table-based layout with inline CSS (not flexbox — unsupported in Outlook desktop / many Gmail rendering paths). Gradients and blurred blobs are decorative-only background layers with a solid `bgcolor` fallback on the containing `<td>`, so Outlook (which ignores CSS gradients) still renders a flat brand-colored header/footer instead of missing background entirely. No external images — the `t4` logo mark is an inline table cell with `bgcolor` + centered text, avoiding image-hosting/blocking concerns entirely.

## Component breakdown (matches the 4 Paper artboards)

| Artboard | Maps to |
|---|---|
| Email Header Background | `renderEmailShell`'s header `<td>` — gradient + logo lockup |
| Email Footer Background | `renderEmailShell`'s footer `<td>` — gradient + logo, copyright, address/contact, Help Center · Unsubscribe |
| Onboarding Welcome — Full Email Template | Reference composition: `renderEmailShell(renderEmailBody({...}))` with the Welcome copy |
| Logo Explorations | Not shipped in the email — reference only, for picking the wordmark used in the header/footer logo lockup (icon+wordmark lockup, direction 05, is what's built into the shell) |

## Footer links — known limitation carried forward

"Help Center" and "Unsubscribe" both point at `mailto:hello@mailer.talam4shop.com` — there is no help-center page or unsubscribe/suppression mechanism in the codebase. This was flagged against [2026-07-22-resend-onboarding-emails-design.md](2026-07-22-resend-onboarding-emails-design.md)'s explicit "no unsubscribe — V1 transactional-style nudges only" scope; kept per explicit direction to include both links in the footer design. Building a real unsubscribe/suppression flow is out of scope here.

## Testing plan

- New `lib/email-templates.test.ts`: `renderEmailBody` includes each provided paragraph/list item/CTA label+href/signature in its output, and omits optional fields (heading, list, signature) cleanly when not passed. `renderEmailShell` output includes the footer's copyright text and `EMAIL_BRAND.contactEmail`, and wraps the passed `bodyHtml` unmodified.
- `lib/resend.test.ts` (existing, from the approved spec) is unaffected — it mocks the `resend` package and asserts `to`/`subject`, not HTML internals.

## Known limitations (explicitly out of scope)

- No visual regression testing / email-client screenshot testing (e.g. Litmus) — out of scope for this volume; manual check in Gmail + Outlook web before first real send is a follow-up, not part of this change.
- Reminder and Completion emails are not individually mocked up in Paper — they reuse the same shell, built directly in code from the copy already defined in `lib/resend.ts`'s `REMINDER_COPY` map and the Completion body in the approved spec.
