# Onboarding Email HTML Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task (this project's convention is main-thread execution, not subagent-driven — see Global Constraints). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain `<p>`-tag HTML in `lib/resend.ts`'s three onboarding emails with real branded HTML built from a new `lib/email-templates.ts` (shell + body composer), matching the Paper mockups on the Talam Design file's "Creative" page.

**Architecture:** `lib/email-templates.ts` exports `EMAIL_BRAND` (theme constants sourced from `app/globals.css`), `renderEmailShell(bodyHtml)` (table-based HTML document: gradient header with logo lockup, white body slot, dark gradient footer with copyright/contact/links), and `renderEmailBody(params)` (one flexible content composer — greeting/heading/paragraphs/list/ctas/signature/extraHtml — covering all 3 emails without per-email duplication). `lib/resend.ts` keeps owning subject lines and copy text, and composes `renderEmailShell(renderEmailBody({...}))` for each `html:` field.

**Tech Stack:** Plain TypeScript string templates (no React Email, no MJML, no new dependency), Vitest for tests — matches the existing `lib/resend.ts` pattern exactly.

## Global Constraints

- No new npm dependency — table-based HTML + inline CSS only, per the approved spec's "no React Email" decision.
- Brand colors/text come from `app/globals.css`'s live theme, not the Paper file's token (which was stale indigo `#4f3ff0`; live theme is rust `#c1502e`).
- Mailer sending domain is the fixed string `mailer.talam4shop.com` — **not** derived from `NEXT_PUBLIC_ROOT_DOMAIN`. That env var controls tenant-storefront subdomain routing (`.env` has it set to `mytalam.com` locally, `.env.example` shows `talam4shop.com` — the two disagree, confirming it's the wrong source for a value that must stay fixed regardless of environment: a Resend sending domain is DNS/DKIM-verified once and does not vary between dev and prod).
- Footer "Help Center" and "Unsubscribe" both link to `mailto:hello@mailer.talam4shop.com` — known limitation, no real pages exist yet (documented in the spec, kept per explicit user direction).
- Any user-controlled string interpolated into the HTML (`storeName` — set by the store owner during onboarding) must be HTML-escaped before interpolation, to avoid broken markup or HTML injection from a store name containing `<`, `>`, `&`, or quotes.

---

## Task 1: Fix the mailer FROM address in `lib/resend.ts`

**Files:**
- Modify: `lib/resend.ts:1-4`
- Modify: `lib/resend.test.ts:23`

**Interfaces:**
- Produces: `FROM` constant, now `'hello@mailer.talam4shop.com'` (no template interpolation) — used unchanged by all 3 send functions in later tasks.

- [ ] **Step 1: Update the failing assertion first**

The existing test asserts on the old (wrong) domain fragment. Change it to assert on the corrected address so it fails against current code:

In `lib/resend.test.ts`, change line 23 from:
```ts
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'owner@example.com', from: expect.stringContaining('mail.'), subject: expect.any(String) })
    )
```
to:
```ts
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'owner@example.com', from: 'hello@mailer.talam4shop.com', subject: expect.any(String) })
    )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "F:/Product/Talam/Web App/Source/talam-web-app" && npx vitest run lib/resend.test.ts 2>&1 | tail -40`
Expected: FAIL — actual `from` is still `hello@mail.mytalam.com` (current code reads `NEXT_PUBLIC_ROOT_DOMAIN`, which is `mytalam.com` in this repo's `.env`).

- [ ] **Step 3: Fix the constant**

In `lib/resend.ts`, replace line 4:
```ts
const FROM = `hello@mail.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'mytalam.com'}`
```
with:
```ts
const FROM = 'hello@mailer.talam4shop.com'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "F:/Product/Talam/Web App/Source/talam-web-app" && npx vitest run lib/resend.test.ts 2>&1 | tail -40`
Expected: PASS (all existing tests in the file, not just the one changed).

- [ ] **Step 5: Commit**

```bash
cd "F:/Product/Talam/Web App/Source/talam-web-app"
git add lib/resend.ts lib/resend.test.ts
git commit -m "fix: correct Resend sending domain to mailer.talam4shop.com

FROM was hello@mail.\${NEXT_PUBLIC_ROOT_DOMAIN ?? 'mytalam.com'} - wrong
subdomain prefix (mail. not mailer.) and derived from a var that's tenant-
routing config, not a fixed Resend-verified sending domain (.env and
.env.example disagree on its value, which is itself evidence it's the
wrong source here)."
```

---

## Task 2: `lib/email-templates.ts` — brand constants and HTML escaping

**Files:**
- Create: `lib/email-templates.ts`
- Create: `lib/email-templates.test.ts`

**Interfaces:**
- Produces: `EMAIL_BRAND` (object, see below), `escapeHtml(value: string): string` — both consumed by Task 3 and Task 4.

- [ ] **Step 1: Write the failing test**

Create `lib/email-templates.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { EMAIL_BRAND, escapeHtml } from './email-templates'

describe('EMAIL_BRAND', () => {
  it('matches the live theme brand color from app/globals.css', () => {
    expect(EMAIL_BRAND.primary).toBe('#C1502E')
  })

  it('has a fixed mailer contact address', () => {
    expect(EMAIL_BRAND.contactEmail).toBe('hello@mailer.talam4shop.com')
  })
})

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
  })

  it('escapes ampersands and single quotes', () => {
    expect(escapeHtml("Tom & Jerry's Shop")).toBe('Tom &amp; Jerry&#39;s Shop')
  })

  it('leaves plain text unchanged', () => {
    expect(escapeHtml('Priya Boutique')).toBe('Priya Boutique')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "F:/Product/Talam/Web App/Source/talam-web-app" && npx vitest run lib/email-templates.test.ts 2>&1 | tail -40`
Expected: FAIL with "Cannot find module './email-templates'" (file doesn't exist yet).

- [ ] **Step 3: Create `lib/email-templates.ts` with brand constants and escaping**

```ts
export const EMAIL_BRAND = {
  primary: '#C1502E', // app/globals.css --color-brand-primary
  primaryTint: '#E8A98D', // lighter mix of primary, used for links on the dark footer
  ink: '#18181B', // --color-fg
  muted: '#8B7D7A', // --color-muted-warm
  mutedBody: '#3F3F46', // paragraph body text — darker than muted for readability at 15px
  surface: '#FFFFFF', // --color-surface
  bg: '#F9F9F9', // --color-bg
  bgDark: '#1A1A1A', // --color-bg-dark
  border: '#E8E8E8', // --color-border
  address: '123 Residency Road, Bengaluru, India',
  contactEmail: 'hello@mailer.talam4shop.com',
} as const

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "F:/Product/Talam/Web App/Source/talam-web-app" && npx vitest run lib/email-templates.test.ts 2>&1 | tail -40`
Expected: PASS (all 5 tests).

- [ ] **Step 5: Commit**

```bash
cd "F:/Product/Talam/Web App/Source/talam-web-app"
git add lib/email-templates.ts lib/email-templates.test.ts
git commit -m "feat: add EMAIL_BRAND constants and escapeHtml for onboarding emails"
```

---

## Task 3: `renderEmailBody` — content composer

**Files:**
- Modify: `lib/email-templates.ts`
- Modify: `lib/email-templates.test.ts`

**Interfaces:**
- Consumes: `EMAIL_BRAND` (Task 2).
- Produces:
```ts
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
Returned string is an HTML fragment (no `<html>`/`<body>` wrapper) — consumed by `renderEmailShell` in Task 4, and directly asserted against in this task's tests.

- [ ] **Step 1: Write the failing tests**

Append to `lib/email-templates.test.ts`:
```ts
import { renderEmailBody } from './email-templates'

describe('renderEmailBody', () => {
  it('includes the greeting, heading, and paragraphs when provided', () => {
    const html = renderEmailBody({
      greeting: 'Hi there,',
      heading: "You're in! 3 minutes to a live store",
      paragraphs: ['Thanks for signing up for Talam.'],
      ctas: [{ label: 'Finish setup →', href: 'https://talam4shop.com/admin/onboarding' }],
      signature: 'See you on the other side,<br/>The Talam Team',
    })
    expect(html).toContain('Hi there,')
    expect(html).toContain("You're in! 3 minutes to a live store")
    expect(html).toContain('Thanks for signing up for Talam.')
    expect(html).toContain('See you on the other side,<br/>The Talam Team')
  })

  it('renders every CTA as a link to its href with its label', () => {
    const html = renderEmailBody({
      paragraphs: ['Congrats!'],
      ctas: [
        { label: 'View your store', href: 'https://priya-boutique.talam4shop.com' },
        { label: 'Go to admin', href: 'https://priya-boutique.talam4shop.com/admin/dashboard' },
      ],
    })
    expect(html).toContain('href="https://priya-boutique.talam4shop.com"')
    expect(html).toContain('View your store')
    expect(html).toContain('href="https://priya-boutique.talam4shop.com/admin/dashboard"')
    expect(html).toContain('Go to admin')
  })

  it('renders list items as an ordered list when provided', () => {
    const html = renderEmailBody({
      paragraphs: ['Here is what to do next:'],
      list: ['Share your store link', 'Add a few more products'],
      ctas: [{ label: 'View your store', href: 'https://x' }],
    })
    expect(html).toContain('<ol')
    expect(html).toContain('Share your store link')
    expect(html).toContain('Add a few more products')
  })

  it('omits greeting, heading, list, and signature markup when not provided', () => {
    const html = renderEmailBody({
      paragraphs: ['You started setting up your Talam store but haven\u2019t finished yet.'],
      ctas: [{ label: 'Resume setup', href: 'https://x' }],
    })
    expect(html).not.toContain('<ol')
  })

  it('appends extraHtml after the rest of the content when provided', () => {
    const html = renderEmailBody({
      paragraphs: ['Body copy.'],
      ctas: [{ label: 'Go', href: 'https://x' }],
      extraHtml: '<p data-testid="extra">Extra block</p>',
    })
    expect(html.indexOf('data-testid="extra"')).toBeGreaterThan(html.indexOf('Body copy.'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "F:/Product/Talam/Web App/Source/talam-web-app" && npx vitest run lib/email-templates.test.ts 2>&1 | tail -60`
Expected: FAIL with "renderEmailBody is not a function" (or import error).

- [ ] **Step 3: Implement `renderEmailBody`**

Append to `lib/email-templates.ts`:
```ts
function renderCta(cta: { label: string; href: string }): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 16px 0;">
      <tr>
        <td bgcolor="${EMAIL_BRAND.primary}" style="border-radius: 8px;">
          <a href="${cta.href}" style="display: inline-block; padding: 13px 24px; font-family: 'DM Sans', system-ui, sans-serif; font-weight: 600; font-size: 15px; color: ${EMAIL_BRAND.surface}; text-decoration: none;">
            ${cta.label}
          </a>
        </td>
      </tr>
    </table>`
}

export function renderEmailBody(params: {
  greeting?: string
  heading?: string
  paragraphs: string[]
  list?: string[]
  ctas: { label: string; href: string }[]
  signature?: string
  extraHtml?: string
}): string {
  const greetingHtml = params.greeting
    ? `<p style="margin: 0 0 24px 0; font-family: 'DM Sans', system-ui, sans-serif; font-size: 15px; color: ${EMAIL_BRAND.muted};">${params.greeting}</p>`
    : ''

  const headingHtml = params.heading
    ? `<h1 style="margin: 0 0 24px 0; font-family: 'Playfair Display', system-ui, serif; font-weight: 600; font-size: 28px; line-height: 36px; color: ${EMAIL_BRAND.ink};">${params.heading}</h1>`
    : ''

  const paragraphsHtml = params.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin: 0 0 24px 0; font-family: 'DM Sans', system-ui, sans-serif; font-size: 15px; line-height: 24px; color: ${EMAIL_BRAND.mutedBody};">${paragraph}</p>`
    )
    .join('')

  const listHtml = params.list
    ? `<ol style="margin: 0 0 24px 0; padding-left: 20px; font-family: 'DM Sans', system-ui, sans-serif; font-size: 15px; line-height: 24px; color: ${EMAIL_BRAND.mutedBody};">${params.list
        .map((item) => `<li style="margin-bottom: 8px;">${item}</li>`)
        .join('')}</ol>`
    : ''

  const ctasHtml = params.ctas.map(renderCta).join('')

  const signatureHtml = params.signature
    ? `<p style="margin: 24px 0 0 0; font-family: 'DM Sans', system-ui, sans-serif; font-size: 14px; line-height: 22px; color: ${EMAIL_BRAND.muted};">${params.signature}</p>`
    : ''

  return `${greetingHtml}${headingHtml}${paragraphsHtml}${listHtml}${ctasHtml}${signatureHtml}${params.extraHtml ?? ''}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "F:/Product/Talam/Web App/Source/talam-web-app" && npx vitest run lib/email-templates.test.ts 2>&1 | tail -60`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Commit**

```bash
cd "F:/Product/Talam/Web App/Source/talam-web-app"
git add lib/email-templates.ts lib/email-templates.test.ts
git commit -m "feat: add renderEmailBody content composer for onboarding emails"
```

---

## Task 4: `renderEmailShell` — header/footer document wrapper

**Files:**
- Modify: `lib/email-templates.ts`
- Modify: `lib/email-templates.test.ts`

**Interfaces:**
- Consumes: `EMAIL_BRAND` (Task 2).
- Produces: `export function renderEmailShell(bodyHtml: string): string` — consumed by Task 5.

- [ ] **Step 1: Write the failing tests**

Append to `lib/email-templates.test.ts`:
```ts
import { renderEmailShell } from './email-templates'

describe('renderEmailShell', () => {
  it('wraps the given bodyHtml unmodified', () => {
    const html = renderEmailShell('<p data-testid="marker">unique body content</p>')
    expect(html).toContain('<p data-testid="marker">unique body content</p>')
  })

  it('includes the footer copyright and fixed contact address', () => {
    const html = renderEmailShell('<p>body</p>')
    expect(html).toContain('All rights reserved')
    expect(html).toContain(EMAIL_BRAND.contactEmail)
    expect(html).toContain(EMAIL_BRAND.address)
  })

  it('includes the talam4shop wordmark in both header and footer', () => {
    const html = renderEmailShell('<p>body</p>')
    expect(html.match(/talam4shop/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('is a full HTML document', () => {
    const html = renderEmailShell('<p>body</p>')
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "F:/Product/Talam/Web App/Source/talam-web-app" && npx vitest run lib/email-templates.test.ts 2>&1 | tail -60`
Expected: FAIL with "renderEmailShell is not a function".

- [ ] **Step 3: Implement `renderEmailShell`**

Append to `lib/email-templates.ts`:
```ts
function renderLogoLockup(iconSize: number, fontSize: number, textColor: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" align="center">
      <tr>
        <td bgcolor="${EMAIL_BRAND.primary}" width="${iconSize}" height="${iconSize}" style="border-radius: ${Math.round(iconSize * 0.28)}px; text-align: center; vertical-align: middle;">
          <span style="font-family: 'DM Sans', system-ui, sans-serif; font-weight: 700; font-size: ${Math.round(iconSize * 0.4)}px; color: ${EMAIL_BRAND.surface};">t4</span>
        </td>
        <td style="padding-left: 12px; font-family: 'DM Sans', system-ui, sans-serif; font-weight: 700; font-size: ${fontSize}px; color: ${textColor};">
          talam4shop
        </td>
      </tr>
    </table>`
}

export function renderEmailShell(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>talam4shop</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${EMAIL_BRAND.bg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${EMAIL_BRAND.bg}">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;" bgcolor="${EMAIL_BRAND.surface}">
          <tr>
            <td bgcolor="${EMAIL_BRAND.primary}" style="background-image: linear-gradient(135deg, ${EMAIL_BRAND.surface} 0%, ${EMAIL_BRAND.bg} 55%, #F3E3DC 100%); padding: 32px 0;">
              ${renderLogoLockup(32, 17, EMAIL_BRAND.ink)}
            </td>
          </tr>
          <tr>
            <td bgcolor="${EMAIL_BRAND.primary}" height="3" style="font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <tr>
            <td bgcolor="${EMAIL_BRAND.surface}" style="padding: 40px 48px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td bgcolor="${EMAIL_BRAND.bgDark}" style="background-image: linear-gradient(160deg, ${EMAIL_BRAND.bgDark} 0%, #241B18 60%, #2B1E19 100%); padding: 28px 24px;">
              <div style="text-align: center; padding-bottom: 16px;">
                ${renderLogoLockup(22, 13, EMAIL_BRAND.surface)}
              </div>
              <p style="margin: 0 0 4px 0; text-align: center; font-family: 'DM Sans', system-ui, sans-serif; font-size: 12px; color: #FFFFFF8C;">
                &copy; 2026 talam4shop. All rights reserved.
              </p>
              <p style="margin: 0 0 12px 0; text-align: center; font-family: 'DM Sans', system-ui, sans-serif; font-size: 12px; color: #FFFFFF8C;">
                ${EMAIL_BRAND.address} &middot; ${EMAIL_BRAND.contactEmail}
              </p>
              <p style="margin: 0; text-align: center; font-family: 'DM Sans', system-ui, sans-serif; font-size: 12px; font-weight: 500;">
                <a href="mailto:${EMAIL_BRAND.contactEmail}" style="color: ${EMAIL_BRAND.primaryTint}; text-decoration: none;">Help Center</a>
                &middot;
                <a href="mailto:${EMAIL_BRAND.contactEmail}" style="color: ${EMAIL_BRAND.primaryTint}; text-decoration: none;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "F:/Product/Talam/Web App/Source/talam-web-app" && npx vitest run lib/email-templates.test.ts 2>&1 | tail -60`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Commit**

```bash
cd "F:/Product/Talam/Web App/Source/talam-web-app"
git add lib/email-templates.ts lib/email-templates.test.ts
git commit -m "feat: add renderEmailShell header/footer document wrapper"
```

---

## Task 5: Wire the shell/body into `lib/resend.ts`'s three send functions

**Files:**
- Modify: `lib/resend.ts`
- Modify: `lib/resend.test.ts`

**Interfaces:**
- Consumes: `renderEmailShell`, `renderEmailBody`, `escapeHtml` (Tasks 2–4).

- [ ] **Step 1: Write the failing tests**

Add to `lib/resend.test.ts` (inside the existing `describe` blocks, after the existing tests — keep the `vi.mock('resend', ...)` and imports at the top as-is, just add these `it` blocks and this new top-level import):
```ts
import { escapeHtml } from './email-templates'
```
Add inside `describe('sendOnboardingWelcomeEmail', ...)`:
```ts
  it('includes the onboardingUrl in the email HTML', async () => {
    await sendOnboardingWelcomeEmail('owner@example.com', { onboardingUrl: 'https://talam4shop.com/admin/onboarding' })
    const html = sendMock.mock.calls[0][0].html
    expect(html).toContain('https://talam4shop.com/admin/onboarding')
    expect(html).toContain("You're in! 3 minutes to a live store")
  })
```
Add inside `describe('sendOnboardingReminderEmail', ...)`:
```ts
  it('includes the onboardingUrl and matching copy for each reminderNumber', async () => {
    await sendOnboardingReminderEmail('owner@example.com', { onboardingUrl: 'https://x/admin/onboarding', reminderNumber: 2 })
    const html = sendMock.mock.calls[0][0].html
    expect(html).toContain('https://x/admin/onboarding')
    expect(html).toContain('Your store is almost ready to go live')
  })
```
Add inside `describe('sendOnboardingCompleteEmail', ...)`:
```ts
  it('includes storeName (escaped), storeUrl, and adminUrl in the email HTML', async () => {
    await sendOnboardingCompleteEmail('owner@example.com', {
      storeName: 'Priya\'s <Boutique>',
      storeUrl: 'https://priya-boutique.talam4shop.com',
      adminUrl: 'https://priya-boutique.talam4shop.com/admin/dashboard',
    })
    const html = sendMock.mock.calls[0][0].html
    expect(html).toContain(escapeHtml("Priya's <Boutique>"))
    expect(html).not.toContain("Priya's <Boutique>") // raw, unescaped value must not appear
    expect(html).toContain('https://priya-boutique.talam4shop.com')
    expect(html).toContain('https://priya-boutique.talam4shop.com/admin/dashboard')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "F:/Product/Talam/Web App/Source/talam-web-app" && npx vitest run lib/resend.test.ts 2>&1 | tail -60`
Expected: FAIL — current `html` is still plain `<p>` markup with no heading/list structure and no escaping.

- [ ] **Step 3: Rewrite `lib/resend.ts` to compose the shell/body**

Replace the full contents of `lib/resend.ts`:
```ts
import { Resend } from 'resend'
import { escapeHtml, renderEmailBody, renderEmailShell } from './email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'hello@mailer.talam4shop.com'

export async function sendOnboardingWelcomeEmail(to: string, params: { onboardingUrl: string }): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "You're in! 3 minutes to a live store",
      html: renderEmailShell(
        renderEmailBody({
          greeting: 'Hi there,',
          heading: "You're in! 3 minutes to a live store",
          paragraphs: [
            "Thanks for signing up for Talam. You're just a few steps away from a store customers can actually buy from — logo, first product, and how you want to get paid.",
          ],
          ctas: [{ label: 'Finish setup →', href: params.onboardingUrl }],
          signature: 'See you on the other side,<br/>The Talam Team',
        })
      ),
    })
  } catch (err) {
    console.error('[Resend] sendOnboardingWelcomeEmail failed:', err)
  }
}

const REMINDER_COPY: Record<1 | 2 | 3, { subject: string; body: string }> = {
  1: {
    subject: 'Finish setting up your store',
    body: 'You started setting up your Talam store but haven\'t finished yet. It only takes a few more minutes.',
  },
  2: {
    subject: 'Your store is one step away',
    body: "Your store is almost ready to go live — just a couple of steps left. Don't let it sit unfinished.",
  },
  3: {
    subject: 'Last reminder — your store setup is waiting',
    body: 'This is your final reminder. Your Talam store setup is still incomplete. Pick up right where you left off — it won\'t take long.',
  },
}

export async function sendOnboardingReminderEmail(
  to: string,
  params: { onboardingUrl: string; reminderNumber: 1 | 2 | 3 }
): Promise<void> {
  const copy = REMINDER_COPY[params.reminderNumber]
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: copy.subject,
      html: renderEmailShell(
        renderEmailBody({
          paragraphs: [copy.body],
          ctas: [{ label: 'Resume setup →', href: params.onboardingUrl }],
        })
      ),
    })
  } catch (err) {
    console.error('[Resend] sendOnboardingReminderEmail failed:', err)
  }
}

export async function sendOnboardingCompleteEmail(
  to: string,
  params: { storeName: string; storeUrl: string; adminUrl: string }
): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Your store is ready — here's what's next",
      html: renderEmailShell(
        renderEmailBody({
          paragraphs: [`Congrats — <strong>${escapeHtml(params.storeName)}</strong> is live on Talam!`, "Here's what to do next:"],
          list: ['Share your store link with customers', 'Add a few more products to fill out your catalog', 'Check Settings to make sure your payment details are correct'],
          ctas: [
            { label: 'View your store', href: params.storeUrl },
            { label: 'Go to admin', href: params.adminUrl },
          ],
        })
      ),
    })
  } catch (err) {
    console.error('[Resend] sendOnboardingCompleteEmail failed:', err)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "F:/Product/Talam/Web App/Source/talam-web-app" && npx vitest run lib/resend.test.ts lib/email-templates.test.ts 2>&1 | tail -80`
Expected: PASS (all tests in both files).

- [ ] **Step 5: Commit**

```bash
cd "F:/Product/Talam/Web App/Source/talam-web-app"
git add lib/resend.ts lib/resend.test.ts
git commit -m "feat: send branded HTML for onboarding emails via renderEmailShell/renderEmailBody"
```

---

## Task 6: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full targeted test suite**

Run: `cd "F:/Product/Talam/Web App/Source/talam-web-app" && npx vitest run lib/resend.test.ts lib/email-templates.test.ts app/admin/onboarding/actions.test.ts app/api/cron/onboarding-reminders/route.test.ts components/auth/otp-form.test.tsx lib/tenant-url.test.ts 2>&1 | tail -80`
Expected: All suites PASS. (`app/admin/onboarding/actions.test.ts` and the cron route test mock `sendOnboardingWelcomeEmail`/`sendOnboardingCompleteEmail`/`sendOnboardingReminderEmail` directly per their existing setup, so they're unaffected by the HTML change — confirms no regression.)

- [ ] **Step 2: Type-check**

Run: `cd "F:/Product/Talam/Web App/Source/talam-web-app" && npx tsc --noEmit 2>&1 | head -60`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `cd "F:/Product/Talam/Web App/Source/talam-web-app" && npm run lint 2>&1 | tail -60`
Expected: no errors.

- [ ] **Step 4: Manual spot-check of rendered output**

Run: `cd "F:/Product/Talam/Web App/Source/talam-web-app" && node -e "const { renderEmailShell, renderEmailBody } = require('./lib/email-templates.ts'); console.log(renderEmailShell(renderEmailBody({ heading: 'Test', paragraphs: ['Hello'], ctas: [{ label: 'Go', href: 'https://x' }] })))" 2>&1 | head -5`

(This will fail directly under plain `node` since the file is TypeScript — if so, instead write the same call inside a scratch `.ts` file and run it with `npx tsx scratch-email-preview.ts > /tmp/preview.html`, then open `/tmp/preview.html` in a browser to visually confirm the header/body/footer render as expected against the Paper mockup. Delete the scratch file afterward — it's a manual check, not part of the shipped code.)

- [ ] **Step 5: Commit (only if any of the above required fixes)**

If steps 1–3 all passed clean and step 4 looked right, there is nothing to commit here — this task is verification-only.
