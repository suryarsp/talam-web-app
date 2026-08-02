# Multi-Area Fixes: Onboarding, Admin Dashboard, Storefront

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix onboarding email/UPI/product issues, replace admin tour with go-live dialog, improve storefront hero carousel, filter panel, offers sorting, department headers, and occasion page redesign.

**Architecture:** Mostly UI-layer changes across three areas. Onboarding wizard steps get trimmed (remove product step, add UPI address field). Admin go-live tour replaced with a dialog listing pending items. Storefront gets real product carousel, drawer-based filters, offer sorting, dynamic department nav, and an occasion page redesign using vertical carousel + animated text.

**Tech Stack:** Next 16.2, React, Tailwind 4, shadcn (base-nova), Prisma 7.8, zustand, react-hook-form, zod

## Global Constraints

- shadcn base-nova style for all new UI components
- Use `@/components/ui/*` for shadcn primitives
- Existing `font-body`, `font-heading`, `font-marketing` classes
- Store colors: `store-primary`, `brand-primary`, `muted-warm`, `fg`, `bg`, `surface`
- All form fields must use shadcn Input/Textarea/Select primitives, not raw HTML

---

### Task 1: Onboarding — Pre-fill & disable email for Google users

**Files:**
- Modify: `app/admin/onboarding/page.tsx` — pass `userEmail` + `authProvider` props
- Modify: `app/admin/onboarding/onboarding-wizard.tsx` — accept & forward `userEmail`/`authProvider` to ContactStep, default `contactEmail` from it
- Modify: `app/admin/onboarding/contact-step.tsx` — disable email field when provider is google

**Interfaces:**
- Consumes: Supabase `user.email` and `user.app_metadata.provider` from `page.tsx`
- Produces: `ContactStep` accepts `authProvider?: string` and `userEmail?: string`

- [ ] **Step 1: Pass user email and provider from page.tsx**

In `app/admin/onboarding/page.tsx`, the `requireOwnerSession()` already returns `userId`. We need the full user object. Read `createServerClient` + `supabase.auth.getUser()` (already used in admin layout). Add to the page:

```tsx
// In page.tsx, after requireOwnerSession:
const supabase = await createServerClient()
const { data: { user } } = await supabase.auth.getUser()
const userEmail = user?.email ?? ''
const authProvider = user?.app_metadata?.provider ?? ''
```

Pass `userEmail` and `authProvider` to `<OnboardingWizard>`.

- [ ] **Step 2: Wire through OnboardingWizard**

Add `userEmail` and `authProvider` to the component props type. Use `userEmail` as `defaultValues.contactEmail` (fallback to existing `initialTenant?.contactEmail`). Pass both to `<ContactStep>`.

- [ ] **Step 3: Disable email in ContactStep when Google**

```tsx
// In contact-step.tsx, add props: authProvider?: string, userEmail?: string
// On the contactEmail Controller render:
<TextInput
  value={field.value}
  onChange={field.onChange}
  onBlur={field.onBlur}
  invalid={Boolean(fieldState.error)}
  inputMode="email"
  disabled={authProvider === 'google'}
  className={authProvider === 'google' ? 'opacity-60 cursor-not-allowed' : ''}
/>
```

- [ ] **Step 4: Verify in browser**

Start dev server, log in via Google, navigate to onboarding step 3. Email should be pre-filled and disabled.

- [ ] **Step 5: Commit**

```bash
git add app/admin/onboarding/page.tsx app/admin/onboarding/onboarding-wizard.tsx app/admin/onboarding/contact-step.tsx
git commit -m "feat(onboarding): pre-fill and disable email for Google-authenticated users"
```

---

### Task 2: Onboarding — UPI address validation on payment step

**Files:**
- Modify: `app/admin/onboarding/payment-step.tsx` — add UPI address input shown when UPI selected
- Modify: `app/admin/onboarding/onboarding-schema.ts` — add `upiAddress` field with validation
- Modify: `app/admin/onboarding/onboarding-wizard.tsx` — no changes needed if schema handles it
- Modify: `app/admin/onboarding/actions.ts` — persist UPI address in `savePaymentStep`

**Interfaces:**
- Consumes: `control` from react-hook-form, `paymentId` watch value
- Produces: `upiAddress` field in schema, stored on tenant

- [ ] **Step 1: Add upiAddress to schema**

```ts
// In onboarding-schema.ts, add to the object:
upiAddress: z.string().trim().optional(),

// Add superRefine rule:
if (values.paymentId === 'upi' && !values.upiAddress?.trim()) {
  ctx.addIssue({ code: 'custom', path: ['upiAddress'], message: 'Enter your UPI address' })
}
// Also validate format:
if (values.upiAddress?.trim() && !/^[\w.-]+@[\w]+$/.test(values.upiAddress.trim())) {
  ctx.addIssue({ code: 'custom', path: ['upiAddress'], message: 'Enter a valid UPI address (e.g. name@upi)' })
}
```

Add `'upiAddress'` to `STEP_FIELDS[5]`.

- [ ] **Step 2: Add UPI address input to PaymentStep**

Watch `paymentId` via a second Controller or by accepting it as a prop. When `paymentId === 'upi'`, show an input field below the radio cards:

```tsx
<Controller
  control={control}
  name="upiAddress"
  render={({ field, fieldState }) => (
    paymentId === 'upi' ? (
      <div className="mt-4">
        <Field label="UPI Address" error={fieldState.error?.message}>
          <FieldHint>E.g., yourname@paytm or 9876543210@upi</FieldHint>
          <TextInput value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} invalid={Boolean(fieldState.error)} />
        </Field>
      </div>
    ) : null
  )}
/>
```

PaymentStep needs to also receive `watch` or a `paymentId` prop. Simplest: use `useWatch({ control, name: 'paymentId' })` inside PaymentStep.

- [ ] **Step 3: Persist in savePaymentStep**

In `actions.ts`, `savePaymentStep` currently only saves `paymentProvider`. Add `upiAddress` to the input and save it. Check if `Tenant` model has a `upiAddress` or `paymentConfig` JSON field. If `paymentConfig` JSON exists, store there. Otherwise add to the action as a TODO comment — the schema migration is a separate task.

- [ ] **Step 4: Commit**

```bash
git add app/admin/onboarding/payment-step.tsx app/admin/onboarding/onboarding-schema.ts app/admin/onboarding/actions.ts
git commit -m "feat(onboarding): require UPI address validation when UPI payment selected"
```

---

### Task 3: Onboarding — Remove product step

**Files:**
- Modify: `app/admin/onboarding/onboarding-data.ts` — remove product step from STEPS array
- Modify: `app/admin/onboarding/onboarding-schema.ts` — remove product fields, update STEP_FIELDS indices
- Modify: `app/admin/onboarding/onboarding-wizard.tsx` — remove ProductStep rendering, remove step 4 from runStepAction, remove product-related state, update step numbers

**Interfaces:**
- Consumes: nothing new
- Produces: 5-step wizard (Store → Brand → Contact → Story → Payment) instead of 6

- [ ] **Step 1: Remove product entry from STEPS**

In `onboarding-data.ts`, remove the `{ mobile: 'Prod', title: 'Add first product', ... }` entry. The array becomes 5 items. Update `STEP_ACCENTS` to have 5 entries too (remove the sky-500 one at index 4).

- [ ] **Step 2: Remove product fields from schema**

In `onboarding-schema.ts`:
- Remove `productName`, `productPrice`, `productStock`, `productPhoto`, `categoryId` from the schema object
- Update `STEP_FIELDS`: old `{4: product fields, 5: []}` becomes `{4: []}` (payment is now step 4)
- Remove the corresponding type exports if any

- [ ] **Step 3: Update OnboardingWizard**

- Remove `ProductStep` import and rendering
- Remove `categories`, `existingProductPhotoUrl` state
- Remove `getOnboardingCategories` effect
- Remove step 4 product validation (`productPhoto` check)
- Remove `saveProductStep` from `runStepAction` — old step 4 (product) is gone, old step 5 (payment) is now step 4
- Update `runStepAction` mapping: `{0: store, 1: brand, 2: contact, 3: story, 4: payment}`
- Remove `initialProduct` prop and related default values
- Update `StepTitle` step numbers in each step component (ContactStep step prop changes from 3→3, StoryStep stays 4→4, PaymentStep was 6→5)

- [ ] **Step 4: Update step components' step numbers**

- `store-step.tsx`: step 1 (unchanged)
- `brand-step.tsx`: step 2 (unchanged)
- `contact-step.tsx`: step 3 (unchanged)
- `story-step.tsx`: step 4 (unchanged)
- `payment-step.tsx`: step 6 → step 5

- [ ] **Step 5: Clean up page.tsx**

Remove `initialProduct` / `serializedProduct` logic and the `products` include from the Prisma query.

- [ ] **Step 6: Verify and commit**

```bash
git add app/admin/onboarding/
git commit -m "feat(onboarding): remove product step from onboarding wizard"
```

---

### Task 4: Admin — Replace go-live tour with pending-items dialog

**Files:**
- Modify: `components/admin/go-live-button.tsx` — replace tour launch with dialog showing missing items
- Modify: `lib/tours.ts` — remove `buildGoLiveSteps` and `GO_LIVE_TARGETS` (keep orientation tour)
- Modify: `components/admin/admin-nav-shell.tsx` — no changes needed (GoLiveButton already handles click)

**Interfaces:**
- Consumes: `MissingConfigItem[]` from `getTenantLiveStateAction()`
- Produces: Dialog with pending items shown as red-underlined tags linking to their fix pages

- [ ] **Step 1: Redesign GoLiveButton to show dialog with missing items**

Replace the `startTour(buildGoLiveSteps(...))` branch. When `state.missing.length > 0`, open a dialog listing each missing item:

```tsx
// State for missing items
const [missing, setMissing] = useState<MissingConfigItem[]>([])
const [checkOpen, setCheckOpen] = useState(false)

async function handleClick() {
  const state = await getTenantLiveStateAction()
  if (state.missing.length > 0) {
    setMissing(state.missing)
    setCheckOpen(true)
    return
  }
  setDialogOpen(true)  // existing "ready to go live" dialog
}

// In the dialog:
<Dialog open={checkOpen} onClose={() => setCheckOpen(false)} position="center">
  <div className="p-6">
    <h2 className="font-marketing text-lg font-semibold text-fg">Before you go live</h2>
    <p className="mt-1 text-sm text-muted-warm">Complete these items to launch your store:</p>
    <div className="mt-4 flex flex-col gap-2">
      {missing.map((item) => (
        <a key={item.key} href={item.href} onClick={() => setCheckOpen(false)}
          className="flex items-center justify-between rounded-lg border border-danger/20 bg-danger/5 p-3 transition-colors hover:bg-danger/10">
          <div>
            <span className="text-sm font-semibold text-fg">{item.label}</span>
            <p className="text-xs text-muted-warm">{item.description}</p>
          </div>
          <span className="shrink-0 rounded-full border border-danger px-2 py-0.5 text-2xs font-bold text-danger">Pending</span>
        </a>
      ))}
    </div>
  </div>
</Dialog>
```

- [ ] **Step 2: Remove go-live tour infrastructure**

In `lib/tours.ts`, remove `GO_LIVE_TARGETS` and `buildGoLiveSteps`. Keep `ORIENTATION_TOUR` and `visibleTarget`. Remove the import of `buildGoLiveSteps` from `go-live-button.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/admin/go-live-button.tsx lib/tours.ts
git commit -m "feat(admin): replace go-live guided tour with pending-items dialog"
```

---

### Task 5: Admin — Toast when 3+ products added, prompting go-live

**Files:**
- Modify: `app/admin/products/actions.ts` — after `createProductAction`, check product count and return a flag
- Modify: `app/admin/products/products-client.tsx` — show toast when flag is returned

**Interfaces:**
- Consumes: `createProductAction` return value
- Produces: toast notification "You have 3+ products! Click Go Live to enable your store."

- [ ] **Step 1: Return readyToGoLive flag from createProductAction**

In `actions.ts`, after creating a product, count published products. If count >= 3 and tenant is not live, return `{ readyToGoLive: true }`.

- [ ] **Step 2: Show toast in products-client**

After `createProductAction` returns in `handleSubmit`, if `result.readyToGoLive`, use the existing toast pattern (or `sonner` if installed) to show: "You have 3+ products! Click Go Live in the header to enable your store."

Check if `sonner` or a toast lib is installed:

```bash
grep -r "sonner\|react-hot-toast\|toast" package.json
```

If not, use a simple state-based toast or install sonner (shadcn-compatible).

- [ ] **Step 3: Commit**

```bash
git add app/admin/products/actions.ts app/admin/products/products-client.tsx
git commit -m "feat(admin): show toast prompting go-live when 3+ products added"
```

---

### Task 6: Admin — Tour should navigate sidebar pages on hover (orientation tour fix)

**Files:**
- Modify: `lib/tours.ts` — add `route` to each orientation step so the tour navigates to each page
- Modify: `components/admin/tour.tsx` — no changes needed, it already handles `step.route`

**Interfaces:**
- Consumes: `ORIENTATION_TOUR` steps
- Produces: each step navigates to the corresponding admin page

- [ ] **Step 1: Add routes to ORIENTATION_TOUR steps**

Currently all orientation steps have no `route` (they target the always-visible sidebar). Add `route` so the user actually sees each page:

```ts
{
  key: 'nav-settings',
  label: 'Settings',
  description: '...',
  target: visibleTarget('[data-tour="nav-settings"]'),
  route: '/admin/settings',
  isFixed: true,
},
// Similarly for products → /admin/products, occasions → /admin/occasions, etc.
```

The `Tour` component already navigates to `step.route` and waits for the target — this should just work.

- [ ] **Step 2: Verify tour navigates through pages**

Reset `hasSeenSetupTour` to false in DB, reload dashboard, confirm tour walks through each page.

- [ ] **Step 3: Commit**

```bash
git add lib/tours.ts
git commit -m "feat(admin): orientation tour navigates to each admin page"
```

---

### Task 7: Storefront Hero — Show real products, fix last tile, add skeleton

**Files:**
- Modify: `app/store/store-page-client.tsx` — hero carousel uses `banners` (already real products from DB), fix last thumbnail tile, add Skeleton while loading
- Modify: `app/store/page.tsx` — ensure banners query only returns products (already does via `getStoreBanners`)

**Interfaces:**
- Consumes: `banners` prop (already real product data from `StoreBanner` + `Product`)
- Produces: working carousel with real products, no dead last tile

The banners already come from `StoreBanner` → `Product` join in `getStoreBanners()`. The seed creates 3 banners linked to real products. The issue is:
1. The last thumbnail tile (line 365) is a hardcoded empty placeholder — remove it
2. Need Skeleton loading state

- [ ] **Step 1: Remove hardcoded empty thumbnail**

In `store-page-client.tsx` around line 365, remove:
```tsx
<div className="w-[52px] h-[52px] rounded-lg border border-white/30 bg-white/8 shrink-0" />
```

- [ ] **Step 2: Add Skeleton loading state**

Wrap the hero section in a condition: if `banners.length === 0`, show a Skeleton placeholder with the same height (440px mobile, 420px desktop). Use shadcn `Skeleton` component if available, or a simple animated div:

```tsx
{banners.length === 0 ? (
  <div className="h-[440px] md:h-[420px] animate-pulse bg-bg" />
) : hero && (
  <section ...>
    {/* existing hero content */}
  </section>
)}
```

- [ ] **Step 3: Commit**

```bash
git add app/store/store-page-client.tsx
git commit -m "fix(store): remove empty hero thumbnail tile, add skeleton loading"
```

---

### Task 8: Storefront — Filter panel as Drawer (mobile)

**Files:**
- Modify: `app/store/store-page-client.tsx` — replace custom bottom sheet with shadcn Drawer
- May need: `components/ui/drawer.tsx` — install shadcn drawer if not present

**Interfaces:**
- Consumes: existing `filterPanel` JSX, `showMobileFilters` state
- Produces: proper Drawer component from shadcn on mobile

- [ ] **Step 1: Check/install shadcn Drawer**

```bash
npx shadcn@latest add drawer
```

- [ ] **Step 2: Replace mobile filter bottom sheet**

Replace the custom `showMobileFilters` overlay (lines 696-721) with the shadcn Drawer:

```tsx
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer'

<Drawer open={showMobileFilters} onOpenChange={setShowMobileFilters}>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Filters</DrawerTitle>
    </DrawerHeader>
    <div className="px-4 pb-6 overflow-y-auto">
      {/* Sort (mobile only) */}
      <div className="border-b border-[#F0E8D8] mb-5 pb-5">
        {/* existing sort buttons */}
      </div>
      {filterPanel}
    </div>
  </DrawerContent>
</Drawer>
```

Also replace the `FilterBar` on occasion pages (`components/store/filter-bar.tsx`) — the mobile `<details>` disclosure should become a Drawer trigger.

- [ ] **Step 3: Commit**

```bash
git add app/store/store-page-client.tsx components/store/filter-bar.tsx components/ui/drawer.tsx
git commit -m "feat(store): use shadcn Drawer for mobile filter panel"
```

---

### Task 9: Storefront — Shop by Offers sorted by discount percentage

**Files:**
- Modify: `app/store/page.tsx` — sort `offerData` by discount percentage (highest first)
- Modify: `app/store/store-page-client.tsx` — add offer percentage filter chips

**Interfaces:**
- Consumes: `offers` array with `price` and `comparePrice`
- Produces: offers sorted highest discount first, with filter buttons

- [ ] **Step 1: Sort offers by discount percentage**

In `app/store/page.tsx`, sort `offerData` before passing to client:

```ts
const offerData = offerProducts
  .map((p) => ({
    ...existing mapping,
    discountPct: p.comparePrice ? Math.round((1 - Number(p.price) / Number(p.comparePrice)) * 100) : 0,
  }))
  .sort((a, b) => b.discountPct - a.discountPct)
```

- [ ] **Step 2: Add discount filter chips in StorePageClient**

Above the offers grid, add filter buttons: "All", "50%+ Off", "30%+ Off", "10%+ Off":

```tsx
const [offerFilter, setOfferFilter] = useState(0)
const OFFER_FILTERS = [
  { label: 'All', min: 0 },
  { label: '50%+ Off', min: 50 },
  { label: '30%+ Off', min: 30 },
  { label: '10%+ Off', min: 10 },
]
const filteredOffers = offers.filter(o => {
  const pct = o.comparePrice ? Math.round((1 - o.price / o.comparePrice) * 100) : 0
  return pct >= OFFER_FILTERS[offerFilter].min
})
```

- [ ] **Step 3: Commit**

```bash
git add app/store/page.tsx app/store/store-page-client.tsx
git commit -m "feat(store): sort offers by discount percentage with filter chips"
```

---

### Task 10: Storefront Header — Only show departments with products

**Files:**
- Modify: `components/store/store-header.tsx` — accept departments prop, render dynamically
- Modify: `app/store/layout.tsx` — query which departments have products, pass to header

**Interfaces:**
- Consumes: `departments` array from layout query
- Produces: header nav only shows departments that have ≥1 published product

- [ ] **Step 1: Query active departments in store layout**

In `app/store/layout.tsx`, query products grouped by department to find which departments have products:

```ts
const activeDepts = await prisma.product.groupBy({
  by: ['department'],
  where: { tenantId, status: 'published', deletedAt: null, department: { not: null } },
  _count: true,
})
const departments = activeDepts
  .filter(d => d.department)
  .map(d => ({ value: d.department!, label: DEPARTMENTS.find(dep => dep.value === d.department)?.label ?? d.department! }))
```

Pass `departments` to `StoreHeader`.

- [ ] **Step 2: Make StoreHeader dynamic**

Replace the hardcoded Women/Men/Kids/Offers nav with:

```tsx
<nav className="hidden gap-5 lg:flex lg:gap-12">
  {departments.map(dept => (
    <StoreLink key={dept.value} href={`/${dept.value}`} className="font-body font-medium text-fg text-md/snug">
      {dept.label}
    </StoreLink>
  ))}
  <StoreLink href="/offers" className="font-body font-medium text-fg text-md/snug">Offers</StoreLink>
</nav>
```

- [ ] **Step 3: Commit**

```bash
git add components/store/store-header.tsx app/store/layout.tsx
git commit -m "feat(store): only show departments with products in header nav"
```

---

### Task 11: Storefront — Occasion page redesign

**Files:**
- Modify: `components/store/occasion-hero-carousel.tsx` — redesign with vertical carousel, aurora text, 3D flip text
- Add: install `magic-ui` components (aurora-text, text-3d-flip) or inline the effects
- Modify: `app/store/occasion/[occasionSlug]/page.tsx` — minor layout adjustments if needed

**Interfaces:**
- Consumes: `name`, `emoji`, `theme`, `featuredProducts` props (unchanged)
- Produces: redesigned occasion hero with vertical carousel orientation, animated text effects

- [ ] **Step 1: Install/add magic-ui components**

```bash
npx shadcn@latest add "https://magicui.design/r/aurora-text"
npx shadcn@latest add "https://magicui.design/r/text-3d-flip"
```

If these don't install via shadcn CLI, manually create the components by fetching the source from the magic-ui docs.

- [ ] **Step 2: Redesign OccasionHeroCarousel**

Replace the current horizontal slide layout with a vertical-orientation carousel (using shadcn Carousel with `orientation="vertical"` and size variants). Use AuroraText for the occasion name heading, and Text3DFlip for the tagline/headline.

Key structure:
```tsx
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import { AuroraText } from '@/components/magicui/aurora-text'
import { Text3DFlip } from '@/components/magicui/text-3d-flip'

<div className="relative" style={{ backgroundImage: theme.gradient }}>
  <div className="flex flex-col items-center justify-center px-4 py-14 text-center sm:py-20">
    <span className="text-5xl leading-none">{emoji || '🎉'}</span>
    <h1 className="mt-3">
      <AuroraText className="font-heading text-3xl font-bold text-white sm:text-4xl">{name}</AuroraText>
    </h1>
    <Text3DFlip className="mt-2 font-body text-sm text-white/80 sm:text-base">{theme.headline}</Text3DFlip>
  </div>

  {featuredProducts.length > 0 && (
    <div className="mx-auto max-w-xs pb-8">
      <Carousel orientation="vertical" opts={{ loop: true }}>
        <CarouselContent className="-mt-2 h-[300px]">
          {featuredProducts.slice(0, 4).map((product) => (
            <CarouselItem key={product.id} className="pt-2 basis-1/2">
              <ProductCard product={product} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  )}
</div>
```

- [ ] **Step 3: Remove old horizontal slide logic**

Remove the `useState`/`useEffect`/`useCallback`/`useRef` carousel state management (the shadcn Carousel handles this internally). Remove touch handlers.

- [ ] **Step 4: Verify in browser**

Navigate to an occasion page. Confirm vertical carousel scrolls, aurora text animates, flip text works.

- [ ] **Step 5: Commit**

```bash
git add components/store/occasion-hero-carousel.tsx components/magicui/ components/ui/carousel.tsx
git commit -m "feat(store): redesign occasion page with vertical carousel and animated text"
```

---

### Task 12: All image uploads — migrate to shadcn Attachment component

All image upload UIs across the app should use the shadcn Attachment component for consistent upload UX (progress, preview, drag-drop).

**Upload locations:**
1. `app/admin/products/products-client.tsx` — product images (raw `<input type="file">`, lines ~410-430)
2. `app/admin/onboarding/brand-step.tsx` — logo upload (custom `FileDropzone`)
3. `app/admin/settings/page.tsx` — `ImageUploadPreview` component (raw `<input type="file">`, line 80)
4. `app/admin/settings/contact-info-tab.tsx` — `GalleryDropzone` component (raw `<input type="file">`, line 72)
5. `app/admin/onboarding/onboarding-fields.tsx` — `FileDropzone` definition (can be removed after migration)

Note: `app/admin/onboarding/product-step.tsx` also uses `FileDropzone` but is removed entirely by Task 3.

**Files:**
- Add: `components/ui/attachment.tsx` — install shadcn attachment
- Modify: `app/admin/products/products-client.tsx` — replace raw file input
- Modify: `app/admin/onboarding/brand-step.tsx` — replace FileDropzone with Attachment
- Modify: `app/admin/settings/page.tsx` — replace ImageUploadPreview internals
- Modify: `app/admin/settings/contact-info-tab.tsx` — replace GalleryDropzone internals
- Modify: `app/admin/onboarding/onboarding-fields.tsx` — remove FileDropzone (no remaining consumers after Task 3)

**Interfaces:**
- Consumes: `uploadImage` / `uploadProductImageAction` server actions (unchanged)
- Produces: unified Attachment-based upload UX everywhere

- [ ] **Step 1: Install shadcn Attachment**

```bash
npx shadcn@latest add attachment
```

Check the installed component's API (props, events) before proceeding.

- [ ] **Step 2: Replace product image upload (products-client.tsx)**

In `products-client.tsx` around line 410-430, replace the raw `<input type="file">` with Attachment. Adapt to the component's actual API:

```tsx
import { Attachment } from '@/components/ui/attachment'

<Attachment
  accept="image/*"
  multiple
  maxFiles={5 - images.length}
  disabled={uploading}
  onFilesAdded={async (files) => {
    setUploading(true)
    setError(null)
    try {
      const urls = await Promise.all(files.map((f) => uploadProductImageAction(f)))
      setImages((prev) => [...prev, ...urls].slice(0, 5))
    } catch {
      setError('Image upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }}
/>
```

- [ ] **Step 3: Replace logo upload (brand-step.tsx)**

Replace the `FileDropzone` in `brand-step.tsx` with Attachment. This is a single-file upload (logo), so `multiple={false}`, `maxFiles={1}`. The `onFileChange` callback maps to the Attachment's file event. Show existing logo via Attachment's preview if it supports a URL prop, or keep the existing preview image alongside.

- [ ] **Step 4: Replace settings logo/banner upload (settings/page.tsx)**

Replace the `ImageUploadPreview` component's internal `<input type="file" accept="image/*">` with Attachment. Keep the preview behavior (showing existing image URL).

- [ ] **Step 5: Replace gallery upload (settings/contact-info-tab.tsx)**

Replace the `GalleryDropzone` component's internal file input with Attachment. This is multi-file (gallery photos), max 6. Adapt the `onAdd` callback to Attachment's API.

- [ ] **Step 6: Remove old FileDropzone**

After Tasks 3 (product step removal) and Steps 2-5 above, `FileDropzone` in `onboarding-fields.tsx` has no remaining consumers. Remove it and its tests in `onboarding-fields.test.tsx`.

- [ ] **Step 7: Verify all upload flows in browser**

Test each upload location:
- Admin → Products → Add/Edit product → image upload
- Onboarding → Brand step → logo upload
- Admin → Settings → logo/banner upload
- Admin → Settings → Contact Info → gallery upload

- [ ] **Step 8: Commit**

```bash
git add components/ui/attachment.tsx app/admin/products/products-client.tsx app/admin/onboarding/brand-step.tsx app/admin/onboarding/onboarding-fields.tsx app/admin/onboarding/onboarding-fields.test.tsx app/admin/settings/page.tsx app/admin/settings/contact-info-tab.tsx
git commit -m "feat: migrate all image uploads to shadcn Attachment component"
```
