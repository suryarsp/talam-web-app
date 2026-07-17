# Onboarding v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the onboarding wizard to real DB persistence, extend it to 7 mandatory steps (adding Contact & Address, Your Story), replace the placeholder Go Live button with a real launch flow (rocket overlay → redirect to the live storefront), hide the dashboard sidebar until onboarding is complete, and replace silent empty-field hiding on the storefront with "coming soon" placeholders.

**Architecture:** `app/admin/onboarding/page.tsx` becomes an async Server Component (guard + fetch + redirect-if-done) rendering a client `OnboardingWizard`. Each step's `Next` calls a matching Server Action in `app/admin/onboarding/actions.ts` that upserts by the signed-in owner's `id`, keeping the wizard resumable across reloads. `Go Live` calls `completeOnboarding()`, shows a full-screen launch overlay while it resolves, then redirects.

**Tech Stack:** Next.js App Router (Server Actions), Prisma (`lib/prisma.ts`), `@supabase/ssr` session, Vitest (mocked, no live DB in tests).

## Global Constraints

- Every Server Action re-derives the current user via `requireOwnerSession()` — never trust a client-supplied user id.
- One `Tenant` per owner (`ownerId` becomes `@unique`).
- No image upload pipeline exists. Logo and product photo stay **required to select** in the UI but are never uploaded — `Tenant.logoUrl`/`Product.images` stay empty, matching the documented gap in the spec.
- The `Skip` button is removed everywhere — every step is mandatory.
- Money/security-adjacent paths (`admin-guard`, `actions.ts`) get real tests; pure UI (step components, animation) does not.
- Restart (not reload) the dev server after the Prisma migration.

---

### Task 1: Schema — onboarding state + one-tenant-per-owner

**Files:**
- Modify: `prisma/schema.prisma:53-95` (`model Tenant`)
- Migration: `npx prisma migrate dev --name tenant_onboarding_state`

**Interfaces:**
- Produces: `Tenant.ownerId` (now `@unique`), `Tenant.onboardingStep: Int`, `Tenant.isOnboarded: Boolean` — every later task's Prisma calls depend on these three fields existing.

- [ ] **Step 1: Edit the Tenant model**

In `prisma/schema.prisma`, change line 55 and insert two new fields directly after it:

```prisma
model Tenant {
  id                    String          @id @default(uuid()) @db.Uuid
  ownerId               String          @unique @db.Uuid @map("owner_id")
  onboardingStep        Int             @default(0) @map("onboarding_step")
  isOnboarded           Boolean         @default(false) @map("is_onboarded")
  slug                  String          @unique
  name                  String
  tagline               String?
  ... (rest of the model unchanged)
```

- [ ] **Step 2: Run the migration**

Run: `npx prisma migrate dev --name tenant_onboarding_state`
Expected: migration succeeds. If it fails because two existing seeded rows share an `ownerId`, fix the seed data (`prisma/seed.ts`) first — do not drop the constraint.

- [ ] **Step 3: Regenerate the client and restart the dev server**

Run: `npx prisma generate`
Then restart (not reload) any running `npm run dev` process — a running dev server keeps the pre-migration Prisma Client in memory.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit --pretty`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add tenant onboarding_step/is_onboarded and unique owner_id"
```

---

### Task 2: Owner session guard

**Files:**
- Create: `lib/admin-guard.ts`
- Create: `lib/admin-guard.test.ts`

**Interfaces:**
- Consumes: `createServerClient` from `lib/supabase/server.ts` (returns a Supabase client whose `.auth.getUser()` resolves `{ data: { user } }`).
- Produces: `requireOwnerSession(): Promise<{ userId: string }>` — used by every action in Task 7 and by `app/admin/onboarding/page.tsx` (Task 9).

- [ ] **Step 1: Write the failing test**

Create `lib/admin-guard.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

import { createServerClient } from '@/lib/supabase/server'
import { requireOwnerSession } from './admin-guard'

describe('requireOwnerSession', () => {
  it('redirects to /auth when there is no session', async () => {
    vi.mocked(createServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)

    await expect(requireOwnerSession()).rejects.toThrow('REDIRECT:/auth?next=/admin/onboarding')
  })

  it('returns the userId when a session exists', async () => {
    vi.mocked(createServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    } as never)

    const result = await requireOwnerSession()
    expect(result).toEqual({ userId: 'user-1' })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/admin-guard.test.ts`
Expected: FAIL — `lib/admin-guard.ts` doesn't exist yet.

- [ ] **Step 3: Implement the guard**

Create `lib/admin-guard.ts`:

```typescript
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export async function requireOwnerSession(): Promise<{ userId: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth?next=/admin/onboarding')
  }

  return { userId: user.id }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/admin-guard.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/admin-guard.ts lib/admin-guard.test.ts
git commit -m "feat: add owner session guard for onboarding routes"
```

---

### Task 3: Wizard data — 7 steps, 7 accent colors

**Files:**
- Modify: `app/admin/onboarding/onboarding-data.ts`

**Interfaces:**
- Produces: `STEPS` (7-item readonly array), `STEP_ACCENTS` (7-item readonly array of `{ wash, solid, text }`) — consumed by every step component and the wizard shell (Task 9).

- [ ] **Step 1: Replace `STEPS` and `STEP_ACCENTS`**

In `app/admin/onboarding/onboarding-data.ts`, replace the existing `STEPS` and `STEP_ACCENTS` exports with:

```typescript
export const STEPS = [
  { mobile: 'Store', title: 'Store & website', description: 'Name, category, and URL' },
  { mobile: 'Brand', title: 'Brand your store', description: 'Logo, colors, and look' },
  { mobile: 'Contact', title: 'Contact & address', description: 'Phone, email, and location' },
  { mobile: 'Story', title: 'Your story', description: 'Tagline and about your store' },
  { mobile: 'Prod', title: 'Add first product', description: 'Name, photo, price, and stock' },
  { mobile: 'Pay', title: 'Connect payments', description: 'UPI, Razorpay, or Instamojo' },
  { mobile: 'Live', title: 'Go live', description: 'Launch your store to the world' },
] as const

export const STEP_ACCENTS = [
  { wash: '#c1502e', solid: 'bg-brand-primary', text: 'text-brand-primary' },
  { wash: '#e8577e', solid: 'bg-store-primary', text: 'text-store-primary' },
  { wash: '#f59e0b', solid: 'bg-amber', text: 'text-amber' },
  { wash: '#8b5cf6', solid: 'bg-violet-500', text: 'text-violet-500' },
  { wash: '#0ea5e9', solid: 'bg-sky-500', text: 'text-sky-500' },
  { wash: '#14b8a6', solid: 'bg-teal-500', text: 'text-teal-500' },
  { wash: '#10b981', solid: 'bg-emerald-500', text: 'text-emerald-500' },
] as const
```

Leave `STORE_TYPES`, `BRAND_COLORS`, `PAYMENTS`, and the two type exports untouched.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit --pretty`
Expected: errors in `page.tsx`/step files referencing the old 5-step indices — expected at this point, fixed in later tasks. Confirm the errors are only in files this plan will touch in Tasks 6/9 (`store-step.tsx`, `brand-step.tsx`, `product-step.tsx`, `payment-step.tsx`, `page.tsx`), not elsewhere.

- [ ] **Step 3: Commit**

```bash
git add app/admin/onboarding/onboarding-data.ts
git commit -m "feat: extend onboarding to 7 steps with 7 accent colors"
```

---

### Task 4: Field primitives — TextArea + BrandStep error prop

**Files:**
- Modify: `app/admin/onboarding/onboarding-fields.tsx`
- Modify: `app/admin/onboarding/brand-step.tsx`
- Modify: `app/admin/onboarding/store-step.tsx:22` (step number)
- Modify: `app/admin/onboarding/brand-step.tsx` (step number, via `StepTitle`)

**Interfaces:**
- Produces: `TextArea` component (same `invalid` prop contract as `TextInput`) — consumed by `StoryStep` (Task 5b).
- `BrandStep` gains an `errors: Record<string, string>` prop, reading `errors.brandLogo`.

- [ ] **Step 1: Add `TextArea` to onboarding-fields.tsx**

Add this export to `app/admin/onboarding/onboarding-fields.tsx` (after `TextInput`):

```typescript
export function TextArea({
  invalid,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { readonly invalid?: boolean }) {
  return (
    <textarea
      {...props}
      rows={5}
      className={[
        'resize-none rounded-xl border bg-surface px-5 py-4 font-body text-base leading-6 text-[#1F2937] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-2 focus:shadow-[0_0_0_4px_#4F3FF014]',
        invalid ? 'border-danger focus:border-danger' : 'border-[#E5E7EB] focus:border-brand-primary',
        className ?? '',
      ].join(' ')}
    />
  )
}
```

- [ ] **Step 2: Add the error prop to BrandStep**

In `app/admin/onboarding/brand-step.tsx`, change the signature and add an error message under the dropzone:

```typescript
import { BRAND_COLORS, type BrandColor } from './onboarding-data'
import { FileDropzone, StepTitle } from './onboarding-fields'

export function BrandStep({
  brandColor,
  setBrandColor,
  brandLogo,
  setBrandLogo,
  errors,
}: {
  readonly brandColor: BrandColor
  readonly setBrandColor: (value: BrandColor) => void
  readonly brandLogo: File | null
  readonly setBrandLogo: (file: File | null) => void
  readonly errors: Record<string, string>
}) {
  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <StepTitle step={2} title="Brand your store" description="Add a logo and choose your brand colors." />
      <div className="flex flex-col gap-8">
        <div>
          <p className="font-body text-sm font-medium leading-[18px] text-[#374151]">Store logo</p>
          <FileDropzone
            hint="Upload a square image (PNG, JPG). Recommended: 512×512px or larger."
            fileName={brandLogo?.name ?? null}
            onFileChange={setBrandLogo}
          />
          {errors.brandLogo ? <span className="mt-1.5 block font-body text-xs font-medium text-danger">{errors.brandLogo}</span> : null}
        </div>
        <div>
          <p className="font-body text-sm font-medium leading-[18px] text-[#374151]">Brand color</p>
          <p className="mt-0.5 font-body text-xs leading-tight text-[#6B7280]">
            Used for buttons, links, and highlights across your store.
          </p>
          <div className="mt-2.5 flex gap-3">
            {BRAND_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={[
                  'size-[52px] shrink-0 cursor-pointer rounded-xl transition-colors',
                  color === brandColor ? 'border-[3px] border-brand-primary' : 'border-2 border-[#E5E7EB]',
                ].join(' ')}
                style={{ backgroundColor: color }}
                onClick={() => setBrandColor(color)}
                aria-label={`Use ${color}`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-[#F3F4F6] p-4">
          <span className="size-10 shrink-0 rounded-lg" style={{ backgroundColor: brandColor }} />
          <div className="flex flex-col gap-0.5">
            <span className="font-body text-2xs font-medium uppercase tracking-[0.04em] text-[#6B7280]">Primary</span>
            <span className="font-body text-sm font-semibold leading-tight text-brand-primary">{brandColor}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
```

(`step={2}` is unchanged — Brand is still the 2nd step.)

- [ ] **Step 3: Commit**

```bash
git add app/admin/onboarding/onboarding-fields.tsx app/admin/onboarding/brand-step.tsx
git commit -m "feat: add TextArea field and logo error state to onboarding"
```

---

### Task 5a: New step — Contact & Address

**Files:**
- Create: `app/admin/onboarding/contact-step.tsx`

**Interfaces:**
- Produces: `ContactStep` component — consumed by `onboarding-wizard.tsx` (Task 9).

- [ ] **Step 1: Create the component**

```typescript
import { Field, FieldHint, StepTitle, TextInput } from './onboarding-fields'

export function ContactStep({
  contactPhone,
  setContactPhone,
  contactEmail,
  setContactEmail,
  branchName,
  setBranchName,
  branchAddress,
  setBranchAddress,
  branchCity,
  setBranchCity,
  errors,
}: {
  readonly contactPhone: string
  readonly setContactPhone: (value: string) => void
  readonly contactEmail: string
  readonly setContactEmail: (value: string) => void
  readonly branchName: string
  readonly setBranchName: (value: string) => void
  readonly branchAddress: string
  readonly setBranchAddress: (value: string) => void
  readonly branchCity: string
  readonly setBranchCity: (value: string) => void
  readonly errors: Record<string, string>
}) {
  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <StepTitle step={3} title="Contact & address" description="How customers reach you and where you're based." />
      <div className="flex flex-col gap-6">
        <Field label="Contact phone" error={errors.contactPhone}>
          <FieldHint>Shown on your storefront and used for order updates</FieldHint>
          <TextInput
            value={contactPhone}
            onChange={(event) => setContactPhone(event.target.value)}
            invalid={Boolean(errors.contactPhone)}
            inputMode="tel"
          />
        </Field>
        <Field label="Contact email" error={errors.contactEmail}>
          <FieldHint>Where customers and Talam can reach you</FieldHint>
          <TextInput
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            invalid={Boolean(errors.contactEmail)}
            inputMode="email"
          />
        </Field>
        <Field label="Store name" error={errors.branchName}>
          <FieldHint>E.g., &quot;Main branch&quot; or your shop&apos;s name</FieldHint>
          <TextInput value={branchName} onChange={(event) => setBranchName(event.target.value)} invalid={Boolean(errors.branchName)} />
        </Field>
        <Field label="Address" error={errors.branchAddress}>
          <TextInput value={branchAddress} onChange={(event) => setBranchAddress(event.target.value)} invalid={Boolean(errors.branchAddress)} />
        </Field>
        <Field label="City" error={errors.branchCity}>
          <TextInput value={branchCity} onChange={(event) => setBranchCity(event.target.value)} invalid={Boolean(errors.branchCity)} />
        </Field>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit --pretty`
Expected: no new errors from this file (it isn't imported yet, so it type-checks in isolation).

- [ ] **Step 3: Commit**

```bash
git add app/admin/onboarding/contact-step.tsx
git commit -m "feat: add Contact & Address onboarding step"
```

---

### Task 5b: New step — Your Story

**Files:**
- Create: `app/admin/onboarding/story-step.tsx`

**Interfaces:**
- Consumes: `TextArea` (Task 4).
- Produces: `StoryStep` component — consumed by `onboarding-wizard.tsx` (Task 9).

- [ ] **Step 1: Create the component**

```typescript
import { Field, FieldHint, StepTitle, TextArea, TextInput } from './onboarding-fields'

export function StoryStep({
  tagline,
  setTagline,
  aboutDescription,
  setAboutDescription,
  errors,
}: {
  readonly tagline: string
  readonly setTagline: (value: string) => void
  readonly aboutDescription: string
  readonly setAboutDescription: (value: string) => void
  readonly errors: Record<string, string>
}) {
  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <StepTitle step={4} title="Your story" description="Tell customers who you are and why they should buy from you." />
      <div className="flex flex-col gap-6">
        <Field label="Tagline" error={errors.tagline}>
          <FieldHint>A short line shown near your store name</FieldHint>
          <TextInput value={tagline} onChange={(event) => setTagline(event.target.value)} invalid={Boolean(errors.tagline)} />
        </Field>
        <Field label="About your store" error={errors.aboutDescription}>
          <FieldHint>Shown on your About page</FieldHint>
          <TextArea
            value={aboutDescription}
            onChange={(event) => setAboutDescription(event.target.value)}
            invalid={Boolean(errors.aboutDescription)}
          />
        </Field>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit --pretty`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add app/admin/onboarding/story-step.tsx
git commit -m "feat: add Your Story onboarding step"
```

---

### Task 6: Renumber StepTitle calls, show the product photo error

**Files:**
- Modify: `app/admin/onboarding/store-step.tsx:22`
- Modify: `app/admin/onboarding/product-step.tsx`
- Modify: `app/admin/onboarding/payment-step.tsx:13`

**Interfaces:**
- Consumes: `STEP_ACCENTS` (Task 3) indexed by `StepTitle`'s `step - 1`.

- [ ] **Step 1: Store step stays step 1**

`app/admin/onboarding/store-step.tsx:22` already reads `step={1}` — no change needed. Confirm by reading the file.

- [ ] **Step 2: Product step becomes step 5, and shows the photo error**

In `app/admin/onboarding/product-step.tsx`, change the `StepTitle` call:

```typescript
      <StepTitle
        step={3}
        title="Add your first product"
        description="Upload a product photo, set the price, and stock quantity."
      />
```

to:

```typescript
      <StepTitle
        step={5}
        title="Add your first product"
        description="Upload a product photo, set the price, and stock quantity."
      />
```

Then, in the same file, the photo field is now mandatory (Task 10's `validateStep` sets `errors.productPhoto`) but nothing renders that error today. Change:

```typescript
        <div>
          <span className="font-body text-sm font-medium leading-[18px] text-[#374151]">Product photo</span>
          <FileDropzone
            hint="High-quality photo (min 500×500px)"
            fileName={productPhoto?.name ?? null}
            onFileChange={setProductPhoto}
          />
        </div>
```

to:

```typescript
        <div>
          <span className="font-body text-sm font-medium leading-[18px] text-[#374151]">Product photo</span>
          <FileDropzone
            hint="High-quality photo (min 500×500px)"
            fileName={productPhoto?.name ?? null}
            onFileChange={setProductPhoto}
          />
          {errors.productPhoto ? <span className="mt-1.5 block font-body text-xs font-medium text-danger">{errors.productPhoto}</span> : null}
        </div>
```

- [ ] **Step 3: Payment step becomes step 6**

In `app/admin/onboarding/payment-step.tsx`, change:

```typescript
      <StepTitle
        step={4}
        title="Connect payments"
        description="Choose how you want to receive payments from customers."
      />
```

to:

```typescript
      <StepTitle
        step={6}
        title="Connect payments"
        description="Choose how you want to receive payments from customers."
      />
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/onboarding/product-step.tsx app/admin/onboarding/payment-step.tsx
git commit -m "fix: renumber onboarding step titles for the 7-step wizard"
```

---

### Task 7: Go Live step — real button, no preview link

**Files:**
- Modify: `app/admin/onboarding/go-live-step.tsx`

**Interfaces:**
- Produces: `GoLiveStep` now takes `onGoLive: () => void` and `isPending: boolean` instead of `slug: string` — consumed by `onboarding-wizard.tsx` (Task 9).

- [ ] **Step 1: Rewrite the component**

```typescript
import { CheckCircle2 } from 'lucide-react'

const CHECKLIST = [
  'Store & website created',
  'Brand & branding applied',
  'Contact & address added',
  'Your story added',
  'First product added',
  'Payment gateway connected',
]

export function GoLiveStep({
  onGoLive,
  isPending,
}: {
  readonly onGoLive: () => void
  readonly isPending: boolean
}) {
  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <div className="mb-11">
        <p className="font-body text-xs font-medium uppercase leading-tight tracking-[0.08em] text-emerald-600">Step 7 of 7</p>
        <h1 className="mt-2.5 font-heading text-[32px] font-bold leading-[36px] tracking-[-0.02em] text-[#1F2937] md:text-[36px] md:leading-[44px]">
          Your store is ready!
        </h1>
        <p className="mt-2 font-body text-base leading-6 text-[#6B7280]">
          You've successfully set up everything your store needs to launch.
        </p>
      </div>
      <div className="flex flex-col items-center gap-4">
        <CheckCircle2 className="size-16 text-emerald-500" strokeWidth={1.5} />
        <div className="w-full space-y-2.5">
          {CHECKLIST.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <svg className="size-3" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="font-body text-sm font-medium text-emerald-900">{item}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={onGoLive}
          className="flex h-[52px] w-full cursor-pointer items-center justify-center rounded-xl bg-emerald-500 font-body text-[15px] font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Go Live 🚀
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/onboarding/go-live-step.tsx
git commit -m "feat: wire Go Live button to a real action"
```

---

### Task 8: Launch overlay animation

**Files:**
- Create: `app/admin/onboarding/launch-overlay.tsx`
- Modify: `app/globals.css:167-178` (keyframes block)

**Interfaces:**
- Produces: `LaunchOverlay` component (no props) — consumed by `onboarding-wizard.tsx` (Task 9).

- [ ] **Step 1: Add the keyframe**

In `app/globals.css`, after the existing `@keyframes marquee` block (line 178), add:

```css
@keyframes launchBounce {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50% { transform: translateY(-24px) rotate(3deg); }
}
```

- [ ] **Step 2: Create the overlay component**

```typescript
'use client'

import { useEffect, useState } from 'react'

const STATUS_LINES = ['Packing your store…', 'Clearing the launchpad…', 'Liftoff! 🚀']

export function LaunchOverlay() {
  const [lineIndex, setLineIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setLineIndex((current) => Math.min(current + 1, STATUS_LINES.length - 1))
    }, 700)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-brand-primary via-store-primary to-emerald-500">
      <div className="animate-[launchBounce_1.4s_ease-in-out_infinite] text-7xl">🚀</div>
      <p className="font-body text-lg font-semibold text-white">{STATUS_LINES[lineIndex]}</p>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/onboarding/launch-overlay.tsx app/globals.css
git commit -m "feat: add rocket launch overlay for Go Live"
```

---

### Task 9: Per-step persistence Server Actions

**Files:**
- Create: `app/admin/onboarding/actions.ts`
- Create: `app/admin/onboarding/actions.test.ts`

**Interfaces:**
- Consumes: `requireOwnerSession` (Task 2), `prisma` (`lib/prisma.ts`), `PaymentId` (`onboarding-data.ts`, Task 3 — type unchanged).
- Produces: `saveStoreStep`, `saveBrandStep`, `saveContactStep`, `saveStoryStep`, `saveProductStep`, `savePaymentStep`, `completeOnboarding` — consumed by `onboarding-wizard.tsx` (Task 10). Each returns `Promise<{ error?: string }>` except `completeOnboarding`, which returns `Promise<{ error?: string; storeUrl?: string }>`.

- [ ] **Step 1: Write the failing tests**

Create `app/admin/onboarding/actions.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/admin-guard', () => ({
  requireOwnerSession: vi.fn().mockResolvedValue({ userId: 'user-1' }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenant: { upsert: vi.fn(), update: vi.fn() },
    storeBranch: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    storeAbout: { upsert: vi.fn() },
    product: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Map([['host', 'localhost:3000']])),
}))

import { prisma } from '@/lib/prisma'
import {
  completeOnboarding,
  saveBrandStep,
  saveContactStep,
  savePaymentStep,
  saveProductStep,
  saveStoreStep,
  saveStoryStep,
} from './actions'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('saveStoreStep', () => {
  it('upserts the tenant by ownerId', async () => {
    vi.mocked(prisma.tenant.upsert).mockResolvedValue({} as never)
    const result = await saveStoreStep({ storeName: 'Priya Boutique', slug: 'priya-boutique', category: 'Clothing' })
    expect(result).toEqual({})
    expect(prisma.tenant.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: 'user-1' } }))
  })

  it('returns a friendly error on slug collision', async () => {
    const { Prisma } = await import('@prisma/client')
    const error = Object.create(Prisma.PrismaClientKnownRequestError.prototype)
    error.code = 'P2002'
    error.meta = { target: ['slug'] }
    vi.mocked(prisma.tenant.upsert).mockRejectedValue(error)
    const result = await saveStoreStep({ storeName: 'Priya', slug: 'priya', category: 'Clothing' })
    expect(result).toEqual({ error: 'That store URL is taken — try another.' })
  })
})

describe('saveBrandStep', () => {
  it('updates brandColor', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({} as never)
    const result = await saveBrandStep({ brandColor: '#4F3FF0' })
    expect(result).toEqual({})
    expect(prisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: 'user-1' }, data: expect.objectContaining({ brandColor: '#4F3FF0' }) })
    )
  })
})

describe('saveContactStep', () => {
  it('creates a branch when none exists yet', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({ id: 'tenant-1' } as never)
    vi.mocked(prisma.storeBranch.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.storeBranch.create).mockResolvedValue({} as never)
    const result = await saveContactStep({
      contactPhone: '9999999999',
      contactEmail: 'owner@store.com',
      branchName: 'Main store',
      branchAddress: '123 MG Road',
      branchCity: 'Bengaluru',
    })
    expect(result).toEqual({})
    expect(prisma.storeBranch.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-1', name: 'Main store' }) })
    )
  })

  it('updates the existing branch instead of creating a second one', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({ id: 'tenant-1' } as never)
    vi.mocked(prisma.storeBranch.findFirst).mockResolvedValue({ id: 'branch-1' } as never)
    vi.mocked(prisma.storeBranch.update).mockResolvedValue({} as never)
    await saveContactStep({
      contactPhone: '9999999999',
      contactEmail: 'owner@store.com',
      branchName: 'Main store',
      branchAddress: '123 MG Road',
      branchCity: 'Bengaluru',
    })
    expect(prisma.storeBranch.create).not.toHaveBeenCalled()
    expect(prisma.storeBranch.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'branch-1' } }))
  })
})

describe('saveStoryStep', () => {
  it('updates tagline and upserts the about description', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({ id: 'tenant-1' } as never)
    vi.mocked(prisma.storeAbout.upsert).mockResolvedValue({} as never)
    const result = await saveStoryStep({ tagline: 'Handmade with love', aboutDescription: 'We started in 2020...' })
    expect(result).toEqual({})
    expect(prisma.storeAbout.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-1' } }))
  })
})

describe('saveProductStep', () => {
  it('creates the first product when none exists', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({ id: 'tenant-1' } as never)
    vi.mocked(prisma.product.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.product.create).mockResolvedValue({} as never)
    const result = await saveProductStep({ productName: 'Cotton Saree', productPrice: '1499', productStock: '10' })
    expect(result).toEqual({})
    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-1', name: 'Cotton Saree', sizes: ['Free Size'] }) })
    )
  })
})

describe('savePaymentStep', () => {
  it('maps the payment id to a provider', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({} as never)
    const result = await savePaymentStep({ paymentId: 'razorpay' })
    expect(result).toEqual({})
    expect(prisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentProvider: 'razorpay' }) })
    )
  })
})

describe('completeOnboarding', () => {
  it('marks the tenant onboarded and returns the dev storefront URL', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({ slug: 'priya-boutique' } as never)
    const result = await completeOnboarding()
    expect(result).toEqual({ storeUrl: '/dev/store/priya-boutique' })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/admin/onboarding/actions.test.ts`
Expected: FAIL — `actions.ts` doesn't exist yet.

- [ ] **Step 3: Implement the actions**

Create `app/admin/onboarding/actions.ts`:

```typescript
'use server'

import { headers } from 'next/headers'
import { Prisma } from '@prisma/client'
import { requireOwnerSession } from '@/lib/admin-guard'
import { prisma } from '@/lib/prisma'
import type { PaymentId } from './onboarding-data'

type ActionResult = { error?: string }

function isSlugCollision(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002' &&
    Array.isArray(err.meta?.target) &&
    (err.meta.target as string[]).includes('slug')
  )
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'product'
  )
}

export async function saveStoreStep(input: { storeName: string; slug: string; category: string }): Promise<ActionResult> {
  const { userId } = await requireOwnerSession()
  try {
    await prisma.tenant.upsert({
      where: { ownerId: userId },
      create: { ownerId: userId, name: input.storeName, slug: input.slug, storeType: input.category, onboardingStep: 1 },
      update: { name: input.storeName, slug: input.slug, storeType: input.category, onboardingStep: 1 },
    })
    return {}
  } catch (err) {
    if (isSlugCollision(err)) return { error: 'That store URL is taken — try another.' }
    throw err
  }
}

export async function saveBrandStep(input: { brandColor: string }): Promise<ActionResult> {
  const { userId } = await requireOwnerSession()
  await prisma.tenant.update({
    where: { ownerId: userId },
    data: { brandColor: input.brandColor, onboardingStep: 2 },
  })
  return {}
}

export async function saveContactStep(input: {
  contactPhone: string
  contactEmail: string
  branchName: string
  branchAddress: string
  branchCity: string
}): Promise<ActionResult> {
  const { userId } = await requireOwnerSession()
  const tenant = await prisma.tenant.update({
    where: { ownerId: userId },
    data: { contactPhone: input.contactPhone, contactEmail: input.contactEmail, onboardingStep: 3 },
    select: { id: true },
  })

  const existingBranch = await prisma.storeBranch.findFirst({ where: { tenantId: tenant.id }, select: { id: true } })
  const branchData = { name: input.branchName, address: input.branchAddress, city: input.branchCity }

  if (existingBranch) {
    await prisma.storeBranch.update({ where: { id: existingBranch.id }, data: branchData })
  } else {
    await prisma.storeBranch.create({ data: { ...branchData, tenantId: tenant.id } })
  }

  return {}
}

export async function saveStoryStep(input: { tagline: string; aboutDescription: string }): Promise<ActionResult> {
  const { userId } = await requireOwnerSession()
  const tenant = await prisma.tenant.update({
    where: { ownerId: userId },
    data: { tagline: input.tagline, onboardingStep: 4 },
    select: { id: true },
  })

  await prisma.storeAbout.upsert({
    where: { tenantId: tenant.id },
    create: { tenantId: tenant.id, description: input.aboutDescription },
    update: { description: input.aboutDescription },
  })

  return {}
}

export async function saveProductStep(input: { productName: string; productPrice: string; productStock: string }): Promise<ActionResult> {
  const { userId } = await requireOwnerSession()
  const tenant = await prisma.tenant.update({
    where: { ownerId: userId },
    data: { onboardingStep: 5 },
    select: { id: true },
  })

  const existingProduct = await prisma.product.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })

  const productData = {
    name: input.productName,
    slug: slugify(input.productName),
    price: Number(input.productPrice),
    sizes: ['Free Size'],
    stockBySize: { 'Free Size': Number(input.productStock) },
  }

  if (existingProduct) {
    await prisma.product.update({ where: { id: existingProduct.id }, data: productData })
  } else {
    await prisma.product.create({ data: { ...productData, tenantId: tenant.id } })
  }

  return {}
}

const PAYMENT_PROVIDER_MAP: Record<PaymentId, 'upi_manual' | 'razorpay' | 'instamojo'> = {
  upi: 'upi_manual',
  razorpay: 'razorpay',
  instamojo: 'instamojo',
}

export async function savePaymentStep(input: { paymentId: PaymentId }): Promise<ActionResult> {
  const { userId } = await requireOwnerSession()
  await prisma.tenant.update({
    where: { ownerId: userId },
    data: { paymentProvider: PAYMENT_PROVIDER_MAP[input.paymentId], onboardingStep: 6 },
  })
  return {}
}

export async function completeOnboarding(): Promise<ActionResult & { storeUrl?: string }> {
  const { userId } = await requireOwnerSession()
  const tenant = await prisma.tenant.update({
    where: { ownerId: userId },
    data: { isOnboarded: true, onboardingStep: 7 },
    select: { slug: true },
  })

  const host = (await headers()).get('host')
  const isLocalDev = host?.includes('localhost') ?? false
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'talam4shop.com'
  const storeUrl = isLocalDev ? `/dev/store/${tenant.slug}` : `https://${tenant.slug}.${rootDomain}`

  return { storeUrl }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run app/admin/onboarding/actions.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit --pretty`
Expected: no errors in `actions.ts` or `actions.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add app/admin/onboarding/actions.ts app/admin/onboarding/actions.test.ts
git commit -m "feat: persist each onboarding step immediately, keyed by owner id"
```

---

### Task 10: Wizard shell — Server Component page + client wizard

**Files:**
- Create: `app/admin/onboarding/onboarding-wizard.tsx` (the current `page.tsx` content, extended)
- Modify: `app/admin/onboarding/page.tsx` (replaced entirely — becomes a Server Component)

**Interfaces:**
- Consumes: `saveStoreStep`, `saveBrandStep`, `saveContactStep`, `saveStoryStep`, `saveProductStep`, `savePaymentStep`, `completeOnboarding` (Task 9); `ContactStep` (Task 5a); `StoryStep` (Task 5b); `GoLiveStep` (Task 7, new signature); `LaunchOverlay` (Task 8); `requireOwnerSession` (Task 2).
- Produces: `OnboardingWizard` client component taking `initialTenant`, `initialBranch`, `initialProduct` props.

- [ ] **Step 1: Create the client wizard**

Create `app/admin/onboarding/onboarding-wizard.tsx`:

```typescript
'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import {
  completeOnboarding,
  saveBrandStep,
  saveContactStep,
  savePaymentStep,
  saveProductStep,
  saveStoreStep,
  saveStoryStep,
} from './actions'
import { BrandStep } from './brand-step'
import { ContactStep } from './contact-step'
import { GoLiveStep } from './go-live-step'
import { LaunchOverlay } from './launch-overlay'
import { STEP_ACCENTS, STEPS, type BrandColor, type PaymentId } from './onboarding-data'
import { PaymentStep } from './payment-step'
import { ProductStep } from './product-step'
import { StoreStep } from './store-step'
import { StoryStep } from './story-step'

type InitialTenant = {
  name: string
  slug: string
  storeType: string | null
  brandColor: string | null
  contactPhone: string | null
  contactEmail: string | null
  tagline: string | null
  paymentProvider: string
  onboardingStep: number
  about: { description: string | null } | null
} | null

type InitialBranch = { name: string; address: string | null; city: string | null } | null
type InitialProduct = { name: string; price: unknown; stockBySize: unknown } | null

function firstStockValue(stockBySize: unknown): string {
  if (!stockBySize || typeof stockBySize !== 'object') return ''
  const values = Object.values(stockBySize as Record<string, number>)
  return values.length > 0 ? String(values[0]) : ''
}

const PAYMENT_ID_BY_PROVIDER: Record<string, PaymentId> = {
  upi_manual: 'upi',
  razorpay: 'razorpay',
  instamojo: 'instamojo',
}

export function OnboardingWizard({
  initialTenant,
  initialBranch,
  initialProduct,
}: {
  readonly initialTenant: InitialTenant
  readonly initialBranch: InitialBranch
  readonly initialProduct: InitialProduct
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isLaunching, setIsLaunching] = useState(false)
  const [step, setStep] = useState(initialTenant?.onboardingStep ?? 0)
  const [storeName, setStoreName] = useState(initialTenant?.name ?? "Priya's Boutique")
  const [category, setCategory] = useState(initialTenant?.storeType ?? 'Clothing')
  const [brandColor, setBrandColor] = useState<BrandColor>((initialTenant?.brandColor as BrandColor) ?? '#4F3FF0')
  const [brandLogo, setBrandLogo] = useState<File | null>(null)
  const [contactPhone, setContactPhone] = useState(initialTenant?.contactPhone ?? '')
  const [contactEmail, setContactEmail] = useState(initialTenant?.contactEmail ?? '')
  const [branchName, setBranchName] = useState(initialBranch?.name ?? '')
  const [branchAddress, setBranchAddress] = useState(initialBranch?.address ?? '')
  const [branchCity, setBranchCity] = useState(initialBranch?.city ?? '')
  const [tagline, setTagline] = useState(initialTenant?.tagline ?? '')
  const [aboutDescription, setAboutDescription] = useState(initialTenant?.about?.description ?? '')
  const [productName, setProductName] = useState(initialProduct?.name ?? '')
  const [productPrice, setProductPrice] = useState(initialProduct ? String(initialProduct.price) : '')
  const [productStock, setProductStock] = useState(firstStockValue(initialProduct?.stockBySize))
  const [productPhoto, setProductPhoto] = useState<File | null>(null)
  const [paymentId, setPaymentId] = useState<PaymentId>(PAYMENT_ID_BY_PROVIDER[initialTenant?.paymentProvider ?? 'upi_manual'] ?? 'upi')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const slug = useMemo(
    () =>
      storeName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'your-store',
    [storeName]
  )

  function validateStep(current: number): Record<string, string> {
    if (current === 0) {
      const stepErrors: Record<string, string> = {}
      if (!storeName.trim()) stepErrors.storeName = 'Store name is required'
      if (!category) stepErrors.category = 'Select a category'
      return stepErrors
    }
    if (current === 1) {
      const stepErrors: Record<string, string> = {}
      if (!brandLogo) stepErrors.brandLogo = 'Upload a store logo'
      return stepErrors
    }
    if (current === 2) {
      const stepErrors: Record<string, string> = {}
      if (!contactPhone.trim()) stepErrors.contactPhone = 'Phone number is required'
      if (!contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) stepErrors.contactEmail = 'Enter a valid email'
      if (!branchName.trim()) stepErrors.branchName = 'Store name is required'
      if (!branchAddress.trim()) stepErrors.branchAddress = 'Address is required'
      if (!branchCity.trim()) stepErrors.branchCity = 'City is required'
      return stepErrors
    }
    if (current === 3) {
      const stepErrors: Record<string, string> = {}
      if (!tagline.trim()) stepErrors.tagline = 'Tagline is required'
      if (!aboutDescription.trim()) stepErrors.aboutDescription = 'Tell customers your story'
      return stepErrors
    }
    if (current === 4) {
      const stepErrors: Record<string, string> = {}
      if (!productName.trim()) stepErrors.productName = 'Product name is required'
      if (!productPrice.trim() || Number(productPrice) <= 0) stepErrors.productPrice = 'Enter a valid price'
      if (!productStock.trim() || Number(productStock) < 0) stepErrors.productStock = 'Enter a valid stock quantity'
      if (!productPhoto) stepErrors.productPhoto = 'Upload a product photo'
      return stepErrors
    }
    return {}
  }

  async function runStepAction(current: number): Promise<{ error?: string }> {
    if (current === 0) return saveStoreStep({ storeName, slug, category })
    if (current === 1) return saveBrandStep({ brandColor })
    if (current === 2) return saveContactStep({ contactPhone, contactEmail, branchName, branchAddress, branchCity })
    if (current === 3) return saveStoryStep({ tagline, aboutDescription })
    if (current === 4) return saveProductStep({ productName, productPrice, productStock })
    if (current === 5) return savePaymentStep({ paymentId })
    return {}
  }

  function goNext() {
    const stepErrors = validateStep(step)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }
    setErrors({})
    setServerError(null)
    startTransition(async () => {
      const result = await runStepAction(step)
      if (result.error) {
        setServerError(result.error)
        return
      }
      setStep((current) => Math.min(current + 1, STEPS.length - 1))
    })
  }

  function goBack() {
    setErrors({})
    setServerError(null)
    setStep((current) => Math.max(current - 1, 0))
  }

  function goLive() {
    setIsLaunching(true)
    startTransition(async () => {
      const [result] = await Promise.all([completeOnboarding(), new Promise((resolve) => setTimeout(resolve, 1200))])
      if (result.error || !result.storeUrl) {
        setServerError(result.error ?? 'Something went wrong — try again.')
        setIsLaunching(false)
        return
      }
      router.push(result.storeUrl)
    })
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-surface font-body text-fg">
      {isLaunching ? <LaunchOverlay /> : null}
      <BackgroundWash step={step} />
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[560px] flex-col px-6 pb-32 pt-9 md:pb-16 md:pt-14">
        <ProgressHeader step={step} />
        <section className="relative mt-7 flex-1 rounded-3xl border border-white/70 bg-surface/90 p-7 shadow-[0_24px_70px_-20px_rgba(31,41,55,0.25)] backdrop-blur-sm md:p-11">
          <BackNav step={step} goBack={goBack} />
          {serverError ? <p className="mb-4 font-body text-sm font-medium text-danger">{serverError}</p> : null}
          {step === 0 ? (
            <StoreStep slug={slug} storeName={storeName} setStoreName={setStoreName} category={category} setCategory={setCategory} errors={errors} />
          ) : null}
          {step === 1 ? (
            <BrandStep brandColor={brandColor} setBrandColor={setBrandColor} brandLogo={brandLogo} setBrandLogo={setBrandLogo} errors={errors} />
          ) : null}
          {step === 2 ? (
            <ContactStep
              contactPhone={contactPhone}
              setContactPhone={setContactPhone}
              contactEmail={contactEmail}
              setContactEmail={setContactEmail}
              branchName={branchName}
              setBranchName={setBranchName}
              branchAddress={branchAddress}
              setBranchAddress={setBranchAddress}
              branchCity={branchCity}
              setBranchCity={setBranchCity}
              errors={errors}
            />
          ) : null}
          {step === 3 ? (
            <StoryStep
              tagline={tagline}
              setTagline={setTagline}
              aboutDescription={aboutDescription}
              setAboutDescription={setAboutDescription}
              errors={errors}
            />
          ) : null}
          {step === 4 ? (
            <ProductStep
              productName={productName}
              setProductName={setProductName}
              productPrice={productPrice}
              setProductPrice={setProductPrice}
              productStock={productStock}
              setProductStock={setProductStock}
              productPhoto={productPhoto}
              setProductPhoto={setProductPhoto}
              errors={errors}
            />
          ) : null}
          {step === 5 ? <PaymentStep paymentId={paymentId} setPaymentId={setPaymentId} /> : null}
          {step === 6 ? <GoLiveStep onGoLive={goLive} isPending={isPending} /> : null}
          <DesktopFooter step={step} goNext={goNext} isPending={isPending} />
        </section>
      </div>
      <MobileFooter step={step} goNext={goNext} isPending={isPending} />
    </main>
  )
}

function BackgroundWash({ step }: { readonly step: number }) {
  const accent = STEP_ACCENTS[step]
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -left-32 -top-40 size-[420px] rounded-full opacity-30 blur-3xl transition-[background] duration-700 md:size-[520px]"
        style={{ background: accent.wash }}
      />
      <div
        className="absolute -bottom-44 -right-28 size-[460px] rounded-full opacity-25 blur-3xl transition-[background] duration-700 md:size-[560px]"
        style={{ background: accent.wash }}
      />
      <div className="absolute inset-0 bg-surface/75" />
    </div>
  )
}

function ProgressHeader({ step }: { readonly step: number }) {
  const accent = STEP_ACCENTS[step]
  return (
    <header>
      <div className="flex items-center justify-between">
        <span className="font-heading text-[22px] font-bold leading-7 tracking-[-0.02em] text-[#1F2937]">
          talam<span className={['transition-colors duration-500', accent.text].join(' ')}>.</span>
        </span>
        <span className="font-body text-xs font-semibold uppercase leading-tight tracking-[0.06em] text-[#9CA3AF]">
          Step {step + 1} of {STEPS.length}
        </span>
      </div>
      <div className="mt-4 flex gap-1.5">
        {STEPS.map((item, index) => (
          <div
            key={item.title}
            className={[
              'h-1.5 flex-1 rounded-full transition-colors duration-500',
              index <= step ? STEP_ACCENTS[index].solid : 'bg-[#E5E7EB]',
            ].join(' ')}
          />
        ))}
      </div>
    </header>
  )
}

function BackNav({ step, goBack }: { readonly step: number; readonly goBack: () => void }) {
  if (step === 0 || step === STEPS.length - 1) return null

  return (
    <button
      type="button"
      onClick={goBack}
      className="mb-6 flex cursor-pointer items-center gap-1.5 self-start font-body text-sm font-semibold leading-[18px] text-[#374151] transition-colors hover:text-brand-primary"
    >
      <ArrowLeft className="size-4" strokeWidth={2.2} />
      Back
    </button>
  )
}

function DesktopFooter({ step, goNext, isPending }: { readonly step: number; readonly goNext: () => void; readonly isPending: boolean }) {
  if (step === STEPS.length - 1) return null
  const accent = STEP_ACCENTS[step]
  return (
    <footer className="mt-10 hidden items-center justify-end border-t border-[#F3F4F6] pt-10 md:flex">
      <button
        type="button"
        disabled={isPending}
        className={[
          'flex h-[52px] w-[140px] cursor-pointer items-center justify-center rounded-xl font-body text-[15px] font-semibold leading-[18px] text-surface transition-colors duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60',
          accent.solid,
        ].join(' ')}
        onClick={goNext}
      >
        {isPending ? 'Saving…' : 'Next →'}
      </button>
    </footer>
  )
}

function MobileFooter({ step, goNext, isPending }: { readonly step: number; readonly goNext: () => void; readonly isPending: boolean }) {
  if (step === STEPS.length - 1) return null
  const accent = STEP_ACCENTS[step]
  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 flex h-[105px] items-center justify-end border-t border-[#F3F4F6] bg-surface/95 px-7 py-5 backdrop-blur-sm md:hidden">
      <button
        type="button"
        disabled={isPending}
        className={[
          'flex h-12 min-w-[120px] cursor-pointer items-center justify-center rounded-xl px-7 font-body text-[15px] font-semibold leading-[18px] text-surface transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60',
          accent.solid,
        ].join(' ')}
        onClick={goNext}
      >
        {isPending ? 'Saving…' : 'Next →'}
      </button>
    </footer>
  )
}
```

- [ ] **Step 2: Replace page.tsx with the Server Component**

Replace the entire contents of `app/admin/onboarding/page.tsx`:

```typescript
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireOwnerSession } from '@/lib/admin-guard'
import { prisma } from '@/lib/prisma'
import { OnboardingWizard } from './onboarding-wizard'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const { userId } = await requireOwnerSession()

  const tenant = await prisma.tenant.findUnique({
    where: { ownerId: userId },
    include: {
      about: { select: { description: true } },
      branches: { orderBy: { sortOrder: 'asc' }, take: 1 },
      products: { orderBy: { createdAt: 'asc' }, take: 1 },
    },
  })

  if (tenant?.isOnboarded) {
    const host = (await headers()).get('host')
    const isLocalDev = host?.includes('localhost') ?? false
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'talam4shop.com'
    redirect(isLocalDev ? `/dev/store/${tenant.slug}` : `https://${tenant.slug}.${rootDomain}`)
  }

  return (
    <OnboardingWizard
      initialTenant={tenant}
      initialBranch={tenant?.branches[0] ?? null}
      initialProduct={tenant?.products[0] ?? null}
    />
  )
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit --pretty`
Expected: no errors. If `tenant.products[0].price`/`stockBySize` types don't structurally match `InitialProduct`'s `unknown` fields, that's fine — `unknown` accepts anything; if TypeScript complains about the `about`/`branches` shape instead, adjust the `include` `select` to match `InitialTenant`/`InitialBranch` exactly.

- [ ] **Step 4: Commit**

```bash
git add app/admin/onboarding/onboarding-wizard.tsx app/admin/onboarding/page.tsx
git commit -m "feat: guard onboarding route, resume from saved progress, wire actions"
```

---

### Task 11: Sidebar gating

**Files:**
- Modify: `app/admin/layout.tsx:23-25`

**Interfaces:**
- None (self-contained UI fix).

- [ ] **Step 1: Skip dashboard chrome on the onboarding route**

In `app/admin/layout.tsx`, change:

```typescript
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
```

to:

```typescript
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname.startsWith('/admin/onboarding')) return <>{children}</>

  return (
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit --pretty`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "fix: hide dashboard sidebar until onboarding is complete"
```

---

### Task 12: Storefront empty states

**Files:**
- Modify: `components/store/about-hero.tsx:46-52`
- Modify: `components/store/store-footer.tsx:139-146,206-225,264-275`

**Interfaces:**
- None (pure presentation change; `TenantStorefront` type unchanged).

- [ ] **Step 1: About page description placeholder**

In `components/store/about-hero.tsx`, replace:

```typescript
        <h2 className="font-body text-lg font-bold text-fg">{tenant.about?.storyTitle ?? 'Our Story'}</h2>
        {tenant.about?.description && (
          <p className="font-body text-[15px] leading-[165%] whitespace-pre-line text-muted-warm">
            {tenant.about.description}
          </p>
        )}
```

with:

```typescript
        <h2 className="font-body text-lg font-bold text-fg">{tenant.about?.storyTitle ?? 'Our Story'}</h2>
        <p className="font-body text-[15px] leading-[165%] whitespace-pre-line text-muted-warm">
          {tenant.about?.description ?? <span className="italic text-muted-warm/70">Store description coming soon</span>}
        </p>
```

- [ ] **Step 2: Footer contact rows always render, with placeholders**

In `components/store/store-footer.tsx`, replace the `contactRows` construction:

```typescript
  const contactRows = [
    tenant.contactPhone && { icon: 'phone' as const, label: 'Phone', value: tenant.contactPhone },
    tenant.contactEmail && { icon: 'email' as const, label: 'Email', value: tenant.contactEmail },
    storeAddress && { icon: 'pin' as const, label: 'Store', value: storeAddress },
    tenant.branch?.hours && { icon: 'hours' as const, label: 'Hours', value: tenant.branch.hours },
  ].filter((row): row is { icon: keyof typeof contactIconPaths; label: string; value: string } => Boolean(row))
```

with:

```typescript
  const contactRows: { icon: keyof typeof contactIconPaths; label: string; value: string; isPlaceholder: boolean }[] = [
    { icon: 'phone', label: 'Phone', value: tenant.contactPhone ?? 'Coming soon', isPlaceholder: !tenant.contactPhone },
    { icon: 'email', label: 'Email', value: tenant.contactEmail ?? 'Coming soon', isPlaceholder: !tenant.contactEmail },
    { icon: 'pin', label: 'Store', value: storeAddress ?? 'Coming soon', isPlaceholder: !storeAddress },
    { icon: 'hours', label: 'Hours', value: tenant.branch?.hours ?? 'Coming soon', isPlaceholder: !tenant.branch?.hours },
  ]
```

- [ ] **Step 3: Remove the `contactRows.length > 0` guards, style placeholders**

In the desktop block, replace:

```typescript
          {contactRows.length > 0 && (
            <div className="basis-[300px] shrink-0 border-l border-white/10 pl-12">
              <div className="mb-5 text-[10px] leading-3 font-bold tracking-[0.12em] text-white/30 uppercase">
                Get in Touch
              </div>
              <div className="flex flex-col gap-4">
                {contactRows.map((row) => (
                  <div key={row.label} className="flex items-start gap-3">
                    <div className="mt-px flex size-8 shrink-0 items-center justify-center rounded-lg bg-store-primary/10">
                      <ContactIcon icon={row.icon} color="var(--color-store-primary)" />
                    </div>
                    <div>
                      <div className="mb-[3px] text-xs/tight text-white/35">{row.label}</div>
                      <div className="font-medium whitespace-pre-line text-surface text-md/snug">{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
```

with:

```typescript
          <div className="basis-[300px] shrink-0 border-l border-white/10 pl-12">
            <div className="mb-5 text-[10px] leading-3 font-bold tracking-[0.12em] text-white/30 uppercase">
              Get in Touch
            </div>
            <div className="flex flex-col gap-4">
              {contactRows.map((row) => (
                <div key={row.label} className="flex items-start gap-3">
                  <div className="mt-px flex size-8 shrink-0 items-center justify-center rounded-lg bg-store-primary/10">
                    <ContactIcon icon={row.icon} color="var(--color-store-primary)" />
                  </div>
                  <div>
                    <div className="mb-[3px] text-xs/tight text-white/35">{row.label}</div>
                    <div className={row.isPlaceholder ? 'text-md/snug italic text-white/35' : 'font-medium whitespace-pre-line text-surface text-md/snug'}>
                      {row.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
```

In the mobile block, replace:

```typescript
          {contactRows.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {contactRows.map((row) => (
                <div key={row.label} className="flex items-start gap-2.5">
                  <span className="mt-px shrink-0">
                    <ContactIcon icon={row.icon} color="var(--color-muted-warm)" />
                  </span>
                  <span className="whitespace-pre-line text-sm/tight text-fg">{row.value}</span>
                </div>
              ))}
            </div>
          )}
```

with:

```typescript
          <div className="flex flex-col gap-2.5">
            {contactRows.map((row) => (
              <div key={row.label} className="flex items-start gap-2.5">
                <span className="mt-px shrink-0">
                  <ContactIcon icon={row.icon} color="var(--color-muted-warm)" />
                </span>
                <span className={row.isPlaceholder ? 'text-sm/tight italic text-muted-warm/70' : 'whitespace-pre-line text-sm/tight text-fg'}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit --pretty`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/store/about-hero.tsx components/store/store-footer.tsx
git commit -m "feat: show coming-soon placeholders for empty tenant fields on storefront"
```

---

### Task 13: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit --pretty`
Expected: clean.

- [ ] **Step 2: Full test suite**

Run: `npm run test:run`
Expected: all tests pass (`lib/admin-guard.test.ts`, `app/admin/onboarding/actions.test.ts`).

- [ ] **Step 3: Manual walkthrough**

Start the dev server, sign in as an owner with no existing `Tenant`, and confirm:
1. Landing on `/admin/onboarding` shows no dashboard sidebar/bottom-nav.
2. Each of the 7 steps blocks `Next` until its fields are valid (no `Skip` button anywhere).
3. Refreshing mid-wizard (after step 3) resumes at the same step with fields prefilled.
4. Reusing a slug from another tenant on Step 1 shows the friendly inline error, not a 500.
5. Clicking "Go Live 🚀" on Step 7 shows the rocket overlay, then redirects to `/dev/store/{slug}` with no dashboard chrome missing.
6. Visiting `/dev/store/{slug}/about` and the footer shows "coming soon" text for any field you didn't fill (or all filled, confirm no placeholders appear).
