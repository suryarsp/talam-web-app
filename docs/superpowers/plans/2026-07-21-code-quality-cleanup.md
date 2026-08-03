# Code Quality Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Note for this project:** do NOT use subagent-driven-development / dispatch subagents for this plan — execute inline, one task at a time, in the main session (established preference for talam-web-app).

**Goal:** Fix the reusability, theming, UI-consistency, and test-coverage gaps found in the 2026-07-21 codebase review, without introducing new abstractions beyond what's needed.

**Architecture:** No architectural change. This consolidates duplicated logic into `lib/utils.ts`, replaces hardcoded hex colors with the existing Tailwind tokens already defined in `app/globals.css`, fills 4 missing `components/ui` primitives (matching the existing `base-ui` + `cva` pattern used by `button.tsx`), and adds test coverage for the highest-risk untested surfaces.

**Tech Stack:** Next.js 16 / React 19, Tailwind v4 (`@theme inline` tokens in `app/globals.css`), `@base-ui/react` + `class-variance-authority` for `components/ui` primitives, Vitest + Testing Library.

## Global Constraints

- Do not touch business logic — this is a presentation/DRY cleanup, not a feature change.
- Every new/changed file must pass `npx tsc --noEmit` and `npm run lint`.
- No new dependencies unless a task says so explicitly (Phase 5 is opt-in for this reason).
- Preserve existing visual output exactly in Phases 1–4 (color values and formatted strings must render identically — only the *source* of truth changes, not the output).
- Commit after each task, not each file edit.

---

## Phase 1 — Shared utilities (unblocks everything else)

### Task 1: Add `formatCurrency` and `formatDate` to `lib/utils.ts`

**Files:**
- Modify: `lib/utils.ts`
- Test: `lib/utils.test.ts` (new)

**Interfaces:**
- Produces: `formatCurrency(paise: number): string` — formats integer paise as `"₹1,850"` (no decimals, `en-IN` grouping). Confirm call sites store rupees vs paise before wiring in Phase 2 — `lib/razorpay.ts` uses paise, but page-level mock data (e.g. `app/store/orders/page.tsx`) uses whole rupees, so the helper must accept whichever the call site already has and the call site does the conversion, not the helper guessing.
- Produces: `formatDate(d: Date): string` — `en-IN`, `"21 Jul 2026"` style (day numeric, month short, year numeric) — matches the existing duplicated implementation exactly so output doesn't change.

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/utils.test.ts
import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDate } from './utils'

describe('formatCurrency', () => {
  it('formats whole rupees with en-IN grouping and no decimals', () => {
    expect(formatCurrency(1850)).toBe('₹1,850')
  })
  it('formats large amounts with Indian digit grouping', () => {
    expect(formatCurrency(125000)).toBe('₹1,25,000')
  })
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('₹0')
  })
})

describe('formatDate', () => {
  it('formats a date as "21 Jul 2026"', () => {
    expect(formatDate(new Date('2026-07-21T00:00:00+05:30'))).toBe('21 Jul 2026')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/utils.test.ts`
Expected: FAIL — `formatCurrency`/`formatDate` not exported from `./utils`

- [ ] **Step 3: Implement**

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amountInRupees: number): string {
  return `₹${amountInRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/utils.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/utils.ts lib/utils.test.ts
git commit -m "feat: add shared formatCurrency/formatDate helpers"
```

### Task 2: Replace the two duplicated `formatDate` definitions

**Files:**
- Modify: `app/store/orders/page.tsx:106-108` (delete local `formatDate`, import from `@/lib/utils`)
- Modify: `app/store/orders/[id]/page.tsx:95` (same)

**Interfaces:**
- Consumes: `formatDate` from Task 1.

- [ ] **Step 1:** In both files, delete the local `function formatDate(d: Date) { ... }` block and add `import { formatDate } from "@/lib/utils"` to the existing import block (merge with any existing `@/lib/utils` import rather than adding a second one).
- [ ] **Step 2:** Run `npx tsc --noEmit` — expect no errors (call signature is identical).
- [ ] **Step 3:** Run `npx vitest run app/store/orders` — expect existing tests (if any cover these pages) to still pass; this is a pure refactor so no new test is needed here (`formatDate` itself is already covered by Task 1).
- [ ] **Step 4: Commit**

```bash
git add app/store/orders/page.tsx "app/store/orders/[id]/page.tsx"
git commit -m "refactor: dedupe formatDate into lib/utils"
```

### Task 3: Replace ad-hoc currency formatting with `formatCurrency`

**Files to update** (each has inline `toLocaleString`/manual `₹` string building — grep confirmed, 2026-07-21):
- `app/admin/dashboard/page.tsx`
- `app/admin/orders/page.tsx`
- `app/admin/products/products-client.tsx`
- `app/checkout/confirmed/page.tsx`
- `app/checkout/page.tsx`
- `app/store/cart/page.tsx`
- `app/store/orders/page.tsx`
- `app/store/orders/[id]/page.tsx`
- `app/store/product/[slug]/page.tsx`
- `app/store/store-page-client.tsx`
- `app/store/wishlist/page.tsx`
- `components/checkout/order-summary-card.tsx`
- `components/marketing/pricing.tsx`
- `components/store/product-card.tsx`
- `components/store/search-overlay.tsx`

**Interfaces:**
- Consumes: `formatCurrency` from Task 1.

- [ ] **Step 1:** For each file above, run `grep -n "toLocaleString\|₹" <file>` to locate the exact line(s). Replace the inline formatting expression with `formatCurrency(<amount>)`, adding the import from `@/lib/utils` (merge with existing import if present). Do not change what value is passed in — only replace the formatting expression.
- [ ] **Step 2:** After each file, run `npx tsc --noEmit` to catch import/type mistakes before moving to the next file.
- [ ] **Step 3:** Once all 15 files are done, run `npm run lint` and `npx vitest run` — expect no regressions (existing tests don't assert on formatted price strings directly, per current test files; if any do, confirm the rendered string is byte-identical to before).
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: use shared formatCurrency across price displays"
```

---

## Phase 2 — Theming: replace hardcoded hex with existing tokens

`app/globals.css` already defines `--color-brand-primary` (#C1502E), `--color-amber` (#F59E0B), `--color-danger` (#EF4444), `--color-success`/`--color-success-bg`, `--color-store-primary`, etc. These tasks swap literal hex/arbitrary-value classes for the token classes that already resolve to the same values — output is unchanged, source of truth isn't.

### Task 4: Fix `app/admin/dashboard/page.tsx`

**Files:**
- Modify: `app/admin/dashboard/page.tsx`

- [ ] **Step 1:** Replace status-pill hex classes with token-based equivalents, e.g. `'bg-[#FEF3C7] text-[#92400E]'` → `'bg-amber/10 text-amber'` (or the closest existing semantic pairing already used elsewhere in the file, e.g. `success-bg`/`success` for the "Delivered" row at line 31) — pick the token whose hex matches, don't invent new ones.
- [ ] **Step 2:** Replace the recharts inline color props (lines ~225-235: `stopColor="#C1502E"`, `fill: '#8B7D7A'`, `stroke: '#C1502E'`) with `var(--color-brand-primary)` / `var(--color-muted-warm)` — recharts accepts CSS var strings directly in these props, no component change needed.
- [ ] **Step 3:** Replace the two `text-[#92400E]`/`text-[#991B1B]` alert-tone conditionals (~line 257-262) with `text-amber`/`text-danger`.
- [ ] **Step 4:** Visual check: run `npm run dev`, open `/admin/dashboard`, confirm pill colors, chart line color, and alert tones render identically to before (compare against a screenshot taken before this task if unsure).
- [ ] **Step 5: Commit**

```bash
git add app/admin/dashboard/page.tsx
git commit -m "refactor: use theme tokens instead of hardcoded hex in admin dashboard"
```

### Task 5: Fix remaining files with inline hex

**Files:**
- `app/admin/layout.tsx`
- `app/admin/occasions/occasions-client.tsx`
- `app/admin/onboarding/brand-step.tsx`
- `app/admin/onboarding/onboarding-fields.tsx`
- `app/admin/onboarding/onboarding-wizard.tsx`
- `app/admin/onboarding/product-step.tsx`
- `app/admin/onboarding/store-step.tsx`
- `app/admin/orders/page.tsx`
- `app/admin/products/products-client.tsx`
- `app/admin/settings/page.tsx`
- `app/checkout/confirmed/page.tsx`
- `app/checkout/page.tsx`
- `app/store/account/page.tsx`
- `app/store/store-page-client.tsx`
- `components/admin/admin-nav-shell.tsx`
- `components/admin/order-action-sheet.tsx`
- `components/admin/order-details-modal.tsx`
- `components/marketing/footer.tsx`

(`components/icons/google-icon.tsx` is excluded — brand-mark SVG fills are correctly literal, not theme colors.)

- [ ] **Step 1:** For each file, run `grep -n "#[0-9a-fA-F]\{3,6\}" <file>` and classify each hit: if the hex matches an existing token in `app/globals.css`, swap to the token class/var; if it doesn't match any token (a one-off color), leave it and note it in the commit message rather than inventing a new token for a single use.
- [ ] **Step 2:** Run `npx tsc --noEmit` and `npm run lint` after each file.
- [ ] **Step 3:** Spot-check 3-4 of the changed pages in the browser (`npm run dev`) to confirm no visual diff.
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: use theme tokens instead of hardcoded hex across admin/checkout/store"
```

---

## Phase 3 — Fill missing `components/ui` primitives

Existing `components/ui/button.tsx` pattern: `@base-ui/react` primitive + `cva` variants + `cn()`. New components follow the same shape so they're a drop-in replacement for the raw elements in Phase 4.

### Task 6: Add `components/ui/select.tsx`

**Files:**
- Create: `components/ui/select.tsx`
- Test: `components/ui/select.test.tsx`

**Interfaces:**
- Produces: `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue` (wraps `@base-ui/react/select`, matching shadcn's `base-nova` API surface so Phase 4 call sites read like standard shadcn usage).

- [ ] **Step 1: Write the failing test**

```tsx
// components/ui/select.test.tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './select'

describe('Select', () => {
  it('opens and selects an item', async () => {
    const user = userEvent.setup()
    render(
      <Select defaultValue="a">
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Option A</SelectItem>
          <SelectItem value="b">Option B</SelectItem>
        </SelectContent>
      </Select>
    )
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByText('Option B'))
    expect(screen.getByRole('combobox')).toHaveTextContent('Option B')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/ui/select.test.tsx`
Expected: FAIL — `./select` module not found

- [ ] **Step 3: Implement**

```tsx
// components/ui/select.tsx
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

function Select(props: SelectPrimitive.Root.Props) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectValue(props: SelectPrimitive.Value.Props) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({ className, children, ...props }: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon>
        <ChevronDown className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({ className, children, ...props }: SelectPrimitive.Popup.Props) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner sideOffset={4}>
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            "z-50 max-h-96 min-w-32 overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-md",
            className
          )}
          {...props}
        >
          {children}
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default items-center rounded-md py-1.5 pr-8 pl-2 text-sm outline-none data-[highlighted]:bg-muted",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 flex items-center">
        <Check className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectValue, SelectTrigger, SelectContent, SelectItem }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/ui/select.test.tsx`
Expected: PASS. If `@base-ui/react/select`'s actual prop/slot names differ from what's assumed above, check `node_modules/@base-ui/react/select` types and adjust — the test is the source of truth, not this snippet.

- [ ] **Step 5: Commit**

```bash
git add components/ui/select.tsx components/ui/select.test.tsx
git commit -m "feat: add Select ui primitive"
```

### Task 7: Add `components/ui/textarea.tsx`

**Files:**
- Create: `components/ui/textarea.tsx`
- Test: `components/ui/textarea.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/ui/textarea.test.tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Textarea } from './textarea'

describe('Textarea', () => {
  it('renders a textarea and accepts input', async () => {
    const user = userEvent.setup()
    render(<Textarea aria-label="notes" />)
    const el = screen.getByRole('textbox', { name: 'notes' })
    await user.type(el, 'hello')
    expect(el).toHaveValue('hello')
  })
})
```

- [ ] **Step 2:** Run `npx vitest run components/ui/textarea.test.tsx` — expect FAIL (module not found).
- [ ] **Step 3: Implement**

```tsx
// components/ui/textarea.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-16 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
```

- [ ] **Step 4:** Run `npx vitest run components/ui/textarea.test.tsx` — expect PASS.
- [ ] **Step 5: Commit**

```bash
git add components/ui/textarea.tsx components/ui/textarea.test.tsx
git commit -m "feat: add Textarea ui primitive"
```

### Task 8: Add `components/ui/checkbox.tsx`

**Files:**
- Create: `components/ui/checkbox.tsx`
- Test: `components/ui/checkbox.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/ui/checkbox.test.tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from './checkbox'

describe('Checkbox', () => {
  it('toggles checked state on click', async () => {
    const user = userEvent.setup()
    render(<Checkbox aria-label="agree" />)
    const el = screen.getByRole('checkbox', { name: 'agree' })
    expect(el).not.toBeChecked()
    await user.click(el)
    expect(el).toBeChecked()
  })
})
```

- [ ] **Step 2:** Run `npx vitest run components/ui/checkbox.test.tsx` — expect FAIL.
- [ ] **Step 3: Implement**

```tsx
// components/ui/checkbox.tsx
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-border bg-background outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:border-primary data-[checked]:bg-primary data-[checked]:text-primary-foreground",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
```

- [ ] **Step 4:** Run `npx vitest run components/ui/checkbox.test.tsx` — expect PASS.
- [ ] **Step 5: Commit**

```bash
git add components/ui/checkbox.tsx components/ui/checkbox.test.tsx
git commit -m "feat: add Checkbox ui primitive"
```

### Task 9: Add `components/ui/table.tsx`

**Files:**
- Create: `components/ui/table.tsx`
- Test: `components/ui/table.test.tsx`

**Interfaces:**
- Produces: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` — plain semantic `<table>` wrappers (no headless-UI primitive needed; a table has no interactive state to manage), styled to match the admin list pages (`app/admin/orders/page.tsx`, `app/admin/products/products-client.tsx`) that currently hand-roll table markup.

- [ ] **Step 1: Write the failing test**

```tsx
// components/ui/table.test.tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './table'

describe('Table', () => {
  it('renders header and row cells', () => {
    render(
      <Table>
        <TableHeader><TableRow><TableHead>Order</TableHead></TableRow></TableHeader>
        <TableBody><TableRow><TableCell>#1045</TableCell></TableRow></TableBody>
      </Table>
    )
    expect(screen.getByRole('columnheader', { name: 'Order' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '#1045' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2:** Run `npx vitest run components/ui/table.test.tsx` — expect FAIL.
- [ ] **Step 3: Implement**

```tsx
// components/ui/table.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table data-slot="table" className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("[&_tr]:border-b border-border", className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr data-slot="table-row" className={cn("border-b border-border hover:bg-muted/50", className)} {...props} />
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn("h-9 px-2.5 text-left align-middle text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td data-slot="table-cell" className={cn("p-2.5 align-middle", className)} {...props} />
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
```

- [ ] **Step 4:** Run `npx vitest run components/ui/table.test.tsx` — expect PASS.
- [ ] **Step 5: Commit**

```bash
git add components/ui/table.tsx components/ui/table.test.tsx
git commit -m "feat: add Table ui primitive"
```

---

## Phase 4 — Adopt the UI primitives at call sites

Do this phase file-by-file, highest-traffic first, and **stop and visually verify in the browser after each file** — swapping raw markup for a styled primitive is the step most likely to introduce a visible regression (padding/height/focus-ring differences).

### Task 10: Replace raw `<button>` with `Button` in the admin dashboard and checkout flow

**Files:**
- `app/admin/dashboard/page.tsx` (lines 166, 208, 249, 277, 329, 387, 412)
- `app/checkout/page.tsx`
- `app/checkout/confirmed/page.tsx`
- `app/store/cart/page.tsx`

- [ ] **Step 1:** For each raw `<button className="...">`, replace with `<Button variant="..." size="..." className="...">`, mapping the closest existing `buttonVariants` (`default`/`outline`/`secondary`/`ghost`/`destructive`/`link`) and size (`default`/`xs`/`sm`/`lg`/`icon`) to the current look; keep any layout-only classes (margins, flex) in `className`, drop classes that duplicate what the variant already provides (padding, border-radius, background).
- [ ] **Step 2:** Import `Button` from `@/components/ui/button`.
- [ ] **Step 3:** Run `npm run dev`, open each affected page, click every replaced button, confirm hover/active/focus states and layout match the pre-change screenshot.
- [ ] **Step 4:** Run `npx vitest run` — expect existing tests for these routes (if any) still pass.
- [ ] **Step 5: Commit**

```bash
git add app/admin/dashboard/page.tsx app/checkout/page.tsx app/checkout/confirmed/page.tsx app/store/cart/page.tsx
git commit -m "refactor: use Button component in dashboard, checkout, and cart"
```

### Task 11: Replace raw `<select>`/`<textarea>` in onboarding and checkout forms

**Files:**
- `app/admin/onboarding/onboarding-fields.tsx`
- `app/admin/onboarding/payment-step.tsx`
- `app/admin/onboarding/product-step.tsx`
- `app/checkout/page.tsx`
- `components/store/reviews-section.tsx`

**Interfaces:**
- Consumes: `Select`/`SelectTrigger`/`SelectContent`/`SelectItem`/`SelectValue` from Task 6, `Textarea` from Task 7.

- [ ] **Step 1:** For each raw `<select>`, replace with `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem`, preserving the existing `options` list and the `onChange`/`value` wiring (note: `Select`'s primitive uses `onValueChange`, not `onChange` — update the handler signature accordingly, it still receives the string value).
- [ ] **Step 2:** For each raw `<textarea>`, replace with `Textarea`, keeping all existing props (`value`, `onChange`, `placeholder`, `rows`, etc. — `Textarea` forwards all native textarea props).
- [ ] **Step 3:** Run `npx tsc --noEmit` after each file (the `onChange` → `onValueChange` change is the most likely type error source).
- [ ] **Step 4:** Manually exercise each form in the browser: open a dropdown, pick a value, type in a textarea, submit — confirm the underlying form state updates exactly as before.
- [ ] **Step 5: Commit**

```bash
git add app/admin/onboarding/onboarding-fields.tsx app/admin/onboarding/payment-step.tsx app/admin/onboarding/product-step.tsx app/checkout/page.tsx components/store/reviews-section.tsx
git commit -m "refactor: use Select/Textarea components in onboarding and checkout forms"
```

### Task 12: Replace hand-rolled tables in admin list pages

**Files:**
- `app/admin/orders/page.tsx`
- `app/admin/products/products-client.tsx`

**Interfaces:**
- Consumes: `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell` from Task 9.

- [ ] **Step 1:** Identify the existing `<div>`-grid or raw `<table>` markup used for the order/product list. Replace it with the `Table` primitives, keeping the same columns and cell content, moving column-width/alignment classes onto `TableHead`/`TableCell`.
- [ ] **Step 2:** Run `npx tsc --noEmit`.
- [ ] **Step 3:** Run `npm run dev`, open `/admin/orders` and `/admin/products`, confirm row data, sorting/filtering (if any), and responsive scrolling still work.
- [ ] **Step 4: Commit**

```bash
git add app/admin/orders/page.tsx app/admin/products/products-client.tsx
git commit -m "refactor: use Table component in admin orders and products lists"
```

### Task 13 (optional, do last, lowest priority): Sweep remaining raw `<button>` usages

**Files:** the remaining ~20 files from the review's raw-`<button>` list not covered by Task 10 (`app/admin/occasions/occasions-client.tsx`, `app/admin/onboarding/*.tsx`, `app/store/account/**`, `components/admin/*`, `components/store/*`, `components/auth/*`, `components/checkout/checkout-header.tsx`, `components/marketing/profile-menu.tsx`).

- [ ] **Step 1:** Same transform as Task 10, one file at a time.
- [ ] **Step 2:** Visual check each file's page in the browser before committing it.
- [ ] **Step 3:** Commit per logical group (e.g. all of `components/store/*` in one commit, all of `app/store/account/*` in another) — don't batch unrelated areas into one commit.

---

## Phase 5 — Test coverage for untested client surfaces

Current coverage is logic/action-layer only (`lib/`, `lib/data/`, some `app/**/actions.ts`). Zero client-component or page-render tests exist. Add coverage for the highest-risk interactive components first — not blanket coverage of every file (YAGNI).

### Task 14: Test `components/store/add-to-cart-button.tsx`

**Files:**
- Test: `components/store/add-to-cart-button.test.tsx` (new)

- [ ] **Step 1:** Read `components/store/add-to-cart-button.tsx` in full to confirm its current props/behavior (it was in the modified-files list at session start — confirm what it does before writing assertions against it).
- [ ] **Step 2:** Write a test asserting: clicking the button adds the item to the cart store (`lib/store/cart.ts`) and reflects a loading/success state if one exists. Use the same `render`/`userEvent` pattern as `components/auth/otp-form.test.tsx` for consistency.
- [ ] **Step 3:** Run `npx vitest run components/store/add-to-cart-button.test.tsx` — expect PASS against current behavior (this is coverage, not TDD, since the component already exists and works).
- [ ] **Step 4: Commit**

```bash
git add components/store/add-to-cart-button.test.tsx
git commit -m "test: add coverage for add-to-cart-button"
```

### Task 15: Test the cart page total/quantity logic

**Files:**
- Test: `app/store/cart/page.test.tsx` (new)

- [ ] **Step 1:** Read `app/store/cart/page.tsx` (also in the modified-files list) to find the quantity-update and total-calculation logic.
- [ ] **Step 2:** Write a test rendering the cart with 2+ seeded items, asserting: changing quantity updates the line total and the cart-level total recalculates correctly, and removing an item removes its row.
- [ ] **Step 3:** Run `npx vitest run app/store/cart/page.test.tsx` — expect PASS.
- [ ] **Step 4: Commit**

```bash
git add app/store/cart/page.test.tsx
git commit -m "test: add coverage for cart page quantity/total logic"
```

---

## Phase 6 (optional — requires user sign-off, adds a new dependency)

**Not started without explicit approval** — this is the one gap that can't be closed with existing tools per the project's YAGNI/no-new-dependency default.

### Task 16: Add Prettier for format enforcement

- [ ] Ask the user whether to add `prettier` + a `.prettierrc` + a `format`/`format:check` npm script, or whether ESLint's existing stylistic rules are sufficient. Do not add the dependency speculatively.

---

## Self-Review Notes

- **Coverage:** All 8 findings from the 2026-07-21 review map to a phase: reusability → Phase 1, theming → Phase 2, UI-library consistency → Phases 3-4, utils → Phase 1, Next.js practices → no gap found (no task needed), lint/format → Phase 6 (gated), test coverage → Phase 5. Folder structure had no findings, no task needed.
- **Sequencing:** Phases 3-4 depend on Phase 1 only for `cn()` (already existed) — no hard dependency on Phase 1/2 completing first, but doing 1-2 first is lower-risk (pure refactor before markup changes).
- **Risk ordering:** Phase 1 (logic-free extraction) and Phase 2 (color-value-preserving swaps) are the safest and highest-value; do them first regardless of time constraints. Phase 4 is the only phase with real visual-regression risk — hence the per-file browser check built into every task.
