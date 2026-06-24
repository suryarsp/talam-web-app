# Talam — Open Source Design Spec

**Date:** 2026-06-23
**Status:** Open for Contribution
**Version:** 1.0
**For:** UI/UX designers contributing to the Talam open source project

---

## Welcome, Designer

Talam is an open-source multi-tenant e-commerce SaaS platform built for Indian small businesses. We are looking for design contributions across two surfaces:

1. **Storefront** — what customers see when they visit a store (e.g. `silk.talam.app`)
2. **Tenant Admin Panel** — what store owners use to manage products, orders, and settings (mobile-first)

This document gives you everything you need to contribute designs without writing code.

---

## 1. Design Philosophy

### Core Principles

**1. Mobile-first, always**
Over 80% of customers arrive via a WhatsApp link on a phone. Every screen is designed for a 390px viewport first, then expanded for desktop. If it doesn't work on mobile, it doesn't ship.

**2. Myntra-quality, boutique-soul**
The reference UX is Myntra — clean product photography, smooth transitions, confident typography. But the personality is warm and local, not corporate. Think of it as Myntra if it were built by someone in Chennai for someone in Chennai.

**3. Non-technical store owners**
The admin panel is used by people who manage their business from a phone at 10pm. Every action must be obvious in under 3 seconds. No jargon, no settings menus with 20 options, no tooltips that explain tooltips.

**4. Trust through simplicity**
Customers need to feel safe paying a boutique they discovered via WhatsApp. Clean design, clear order confirmation, visible brand identity, and a professional checkout all build that trust. Avoid anything that looks "free website builder."

**5. Tamil soul, universal appeal**
Talam is Tamil-rooted but designed for any Indian small business. Avoid regional clichés. Use warmth, colour, and craft — not temple motifs or classical illustrations unless the store owner has chosen them.

---

## 2. Brand Identity (Talam Platform)

### Logo Concept
The Talam wordmark uses the concept of a solid ground — the platform that businesses stand on. Clean, modern, no decorative elements.

- **Primary wordmark:** "talam" in lowercase, geometric sans-serif
- **Icon mark:** A simple square with a subtle upward step — represents elevation/platform
- **Colour pairing:** Deep indigo + warm amber

### Colour System

```
--color-brand-primary:    #4F3FF0   /* Indigo — trust, platform */
--color-brand-secondary:  #F59E0B   /* Amber — warmth, India */
--color-brand-dark:       #1A1040   /* Deep indigo — headings */

/* Neutrals */
--color-neutral-50:       #FAFAFA
--color-neutral-100:      #F4F4F5
--color-neutral-200:      #E4E4E7
--color-neutral-400:      #A1A1AA
--color-neutral-600:      #52525B
--color-neutral-900:      #18181B

/* Semantic */
--color-success:          #10B981
--color-warning:          #F59E0B
--color-error:            #EF4444
--color-info:             #3B82F6
```

**Store theming:** Each store has a `brand_color` (set by owner). The storefront uses this as the primary action colour (buttons, links, badges). Design components should accept a `--store-primary` CSS variable that overrides defaults.

### Typography

```
/* Talam platform UI */
--font-sans: 'Inter', system-ui, sans-serif
--font-display: 'Plus Jakarta Sans', sans-serif

/* Storefront (inherits from store owner's preference — default below) */
--font-store-heading: 'Playfair Display', serif   /* elegant, ethnic */
--font-store-body: 'DM Sans', sans-serif
```

**Scale (mobile-first):**
```
xs:   12px / 1.4
sm:   14px / 1.5
base: 16px / 1.6
lg:   18px / 1.5
xl:   20px / 1.4
2xl:  24px / 1.3
3xl:  30px / 1.2
4xl:  36px / 1.1
```

### Spacing System (4px base)
```
1 → 4px    2 → 8px    3 → 12px   4 → 16px
5 → 20px   6 → 24px   8 → 32px   10 → 40px
12 → 48px  16 → 64px  20 → 80px  24 → 96px
```

### Border Radius
```
sm:   4px    (inputs, tags)
md:   8px    (cards, buttons)
lg:   12px   (modals, sheets)
xl:   16px   (product cards)
full: 9999px (pills, avatars)
```

---

## 3. Component Library

Built on **shadcn/ui** (Radix UI primitives + Tailwind). Designers should use shadcn component names and extend — not replace — existing patterns.

### Core Components Needed

| Component | Used In | Notes |
|---|---|---|
| ProductCard | Shop, Home, Wishlist | Mobile: full-width. Desktop: grid. Has sale badge, wishlist heart |
| SizeSelector | Product detail | XS/S/M/L/XL/XXL pill buttons. Selected = filled brand colour |
| CartDrawer | All storefront | Slides from right (Sheet). Shows items, subtotal, checkout CTA |
| ImageGallery | Product detail | Swipeable on mobile. Thumbnail strip on desktop |
| OrderStatusBadge | Orders | Pending/Confirmed/Shipped/Delivered/Cancelled — colour coded |
| PaymentSelector | Checkout | Card UI with radio — UPI QR / Instamojo / Razorpay |
| UPIQRCode | Checkout | Shows store's QR + UPI ID. UTR input for manual confirm |
| SaleBanner | Home | Full-width, dismissable. Countdown timer optional |
| FilterDrawer | Shop | Mobile: bottom sheet. Desktop: left sidebar |
| OnboardingWizard | Admin setup | 6-step progress. Step indicator at top |
| ProductEditor | Admin | Form: name, price, sizes (checkboxes), images (drag-drop) |
| OrderCard | Admin orders | Compact: customer name, items, amount, status, quick action |
| StatCard | Admin dashboard | Number + label + trend arrow. 2-column grid on mobile |
| ThemePicker | Admin settings | Colour swatches + live preview of store primary colour |
| CategoryManager | Admin categories | Editable list of tenant-defined categories with drag-to-reorder and add/delete |
| TrialBanner | All admin | Sticky top bar: "X days left" + Upgrade CTA |

---

## 4. Page-by-Page Design Requirements

### 4.1 Storefront — Home (`/`)

**Purpose:** First impression. Converts WhatsApp link clickers to browsers to buyers.

**Sections (top to bottom):**
1. **Header** — Store logo, store name, nav links (Shop, About), cart icon with badge, account icon
2. **Sale announcement bar** — Dismissable. "Exclusive discounts on Kurtis & Sarees" (if set by owner)
3. **Hero banner** — Full-bleed image + store tagline + primary CTA button ("Shop Now")
4. **Category strips** — Horizontal scrollable cards, one per entry in `product_categories` ordered by `sort_order`. A bakery shows "Cakes / Cookies / Bread"; a boutique shows "Kurtis / Sarees / Tops". Hidden if tenant has defined no categories.
5. **New arrivals grid** — 4 product cards (2-col mobile, 4-col desktop)
6. **About the store** — Short brand story blurb + owner photo (optional)
7. **WhatsApp CTA** — "Questions? Chat with us on WhatsApp" floating button (bottom-right, always visible)
8. **Footer** — Store name, social links, "Powered by Talam" badge (if Free tier)

**Key decisions:**
- Hero image is uploaded by store owner — design must work with any aspect ratio image
- "Powered by Talam" badge: subtle, bottom-right of footer, links to talam.app
- All section content is configurable by store owner

---

### 4.2 Storefront — Shop (`/shop`)

**Purpose:** Product discovery. Filter and browse.

**Layout:**
- Mobile: Filter button (top) → 2-column product grid
- Desktop: Left filter sidebar (fixed) + 3-column product grid

**Filter options:**
- Category — dynamically populated from the tenant's `product_categories` table, ordered by `sort_order`. First option is always "All". A fashion store shows "Kurtis / Sarees / Tops"; a bakery shows "Cakes / Cookies / Bread". Hidden if tenant has no categories defined.
- Size (XS / S / M / L / XL / XXL — multi-select)
- Price range (slider or min/max inputs)
- Sort (Newest / Price: Low to High / Price: High to Low)

**Product card specs:**
- Image (square, 1:1 ratio, lazy loaded)
- Sale badge ("20% OFF") — top-left, red pill
- "New" badge — top-left, green pill
- "Out of stock" overlay — semi-transparent, greyed
- Product name — 2 lines max, ellipsis
- Price — sale price in brand colour + original strikethrough
- Wishlist heart — top-right, toggles filled/unfilled
- Tap card → product detail page
- No hover effects on mobile (touch only)

---

### 4.3 Storefront — Product Detail (`/product/[slug]`)

**Purpose:** Conversion. Make the customer want to buy.

**Mobile layout (top to bottom):**
1. Back arrow
2. Image gallery — full-width, swipeable, dot indicators, zoom on tap
3. Product name (2xl, bold)
4. Price — current + original if on sale
5. Size selector — pill buttons row (XS S M L XL XXL). Greyed if out of stock
6. Size guide link
7. Description (expandable)
8. Sticky bottom bar: "Add to Cart" (brand colour) + wishlist icon
9. Share button (copies link / opens WhatsApp share)

**Desktop layout:**
- Left: Image gallery (main + thumbnails below)
- Right: All product info + sticky Add to Cart

**Out-of-stock state:** Size pill greyed + strikethrough. If all sizes OOS: button shows "Notify Me" (V2).

---

### 4.4 Storefront — Cart (`/cart`)

**Two surfaces:**
1. **CartDrawer** — slides in from right when "Add to Cart" tapped (preferred — no page navigation)
2. **Cart page `/cart`** — full page fallback

**Cart item row:**
- Product thumbnail (60×60)
- Name + size selected
- Quantity stepper (− N +)
- Price
- Remove (×)

**Cart summary:**
- Subtotal
- Discount code input (if Starter/Pro tier)
- Total
- "Proceed to Checkout" CTA (full-width, brand colour)
- "Continue Shopping" text link

---

### 4.5 Storefront — Checkout (`/checkout`)

**Steps (single page, scroll):**
1. **Login / OTP** — if not logged in (inline, not redirect)
2. **Delivery address** — Name, Phone, Address line 1, Line 2, City, State, Pincode
3. **Order summary** — collapsible product list + total
4. **Payment** — provider selector card:
   - UPI QR: shows QR image + UPI ID, UTR input
   - Instamojo / PhonePe / Razorpay: "Pay ₹X" button → opens gateway

**Design notes:**
- Single page scroll, not multi-step wizard
- Progress indicator at top (3 steps: Details → Review → Payment)
- No distractions — no header nav, minimal footer
- Trust signals: lock icon, "Secure Checkout", payment logos

---

### 4.6 Storefront — Orders (`/orders`)

**Order list:**
- Each order: date, order ID (short), items thumbnail stack, total, status badge
- Tap → order detail

**Order detail (`/orders/[id]`):**
- Status timeline (Confirmed → Shipped → Delivered) — step indicator with dates
- Tracking ID (if entered by store owner) + link to courier
- Items list with images
- Payment details
- Delivery address
- "Need help?" → WhatsApp button

---

### 4.7 Tenant Admin — Onboarding Wizard

**Triggered:** First login after signup. Can be skipped and resumed.

**6 steps:**

```
Step 1: Name your store
  - Store name (text input)
  - Store URL preview: [name].talam.app (auto-generated slug)
  - Category (dropdown: Fashion / Food / Education / Beauty / Other)

Step 2: Set up your categories
  - Prompt: "What do you sell? Add your product categories."
  - Tag-style input: type a category name, press Enter to add (e.g. "Cakes", "Cookies", "Bread")
  - Pre-populated suggestions based on store type chosen in Step 1:
    - Fashion → Kurtis, Sarees, Tops, Bottoms, Accessories
    - Food → suggest nothing (too varied — blank slate)
    - Beauty → Skincare, Haircare, Makeup, Wellness
    - Education → Courses, Books, Worksheets
    - Other → blank slate
  - Drag to reorder (sets sort_order)
  - Skip option: "I'll add categories later" — defaults to no categories (filter hidden on storefront)

Step 3: Brand it
  - Upload logo (drag-drop or file pick)
  - Pick primary colour (6 swatches + custom hex input)
  - Live preview: shows "Add to Cart" button in chosen colour

Step 4: Add your first product
  - Product name, price, category
  - Upload 1-3 photos (camera roll on mobile)
  - Select sizes available
  - Skip option

Step 5: Connect payments
  - 3 options (radio cards):
    ○ UPI (enter UPI ID — done instantly)
    ○ Instamojo (enter API key — link to get it)
    ○ Razorpay (enter key ID + secret)

Step 6: Go live
  - Share your store link (copy + WhatsApp share buttons)
  - "View your store" CTA
  - Confetti animation on completion
```

**Step indicator:** Horizontal dots at top. Current = filled brand colour, completed = checkmark, upcoming = empty.

---

### 4.8 Tenant Admin — Dashboard (`/admin/dashboard`)

**Mobile layout:**

```
[Trial banner if applicable]

Today at a glance
┌──────────┐ ┌──────────┐
│ ₹4,200   │ │ 3 Orders │
│ Revenue  │ │  Today   │
└──────────┘ └──────────┘
┌──────────┐ ┌──────────┐
│ 12       │ │ 45       │
│ Products │ │ Visitors │
└──────────┘ └──────────┘

Recent Orders
[Order card × 5]
[View all orders →]

Top Products
[Product row × 3]
```

**Design notes:**
- Stat cards: large number, small label below, subtle trend arrow (↑ ↓)
- 2-column grid on mobile, 4-column on desktop
- Order cards compact: customer name | items | ₹amount | status badge | quick action chevron

---

### 4.9 Tenant Admin — Products (`/admin/products`)

**Product list:**
- Searchable
- Each row: thumbnail + name + price + stock badge (In Stock / Low / Out) + status toggle (Active/Hidden) + edit icon
- "Add Product" FAB (floating action button) — bottom-right, brand colour

**Product editor (modal or full page):**
```
[Product images — drag-drop, up to 5]
[Product name *]
[Description — rich text minimal]
[Category dropdown * — pulls from tenant's product_categories; shows "Manage categories →" link if list is empty]
[Price *] [Compare price (optional)]
[Sizes — checkbox grid: XS S M L XL XXL]
[Stock per size — number inputs, shown only for checked sizes]
[Active toggle]
[Save] [Cancel]
```

---

### 4.10 Tenant Admin — Categories (`/admin/categories`)

**Purpose:** Let store owners define, name, and order the categories their products belong to. Replaces any hardcoded category list — a bakery defines "Cakes / Cookies / Bread", a boutique defines "Kurtis / Sarees / Tops".

**Layout:**
```
[+ Add category]  (top-right)

┌─────────────────────────────────────┐
│ ⠿  Kurtis                      🗑  │
│ ⠿  Sarees                      🗑  │
│ ⠿  Tops                        🗑  │
└─────────────────────────────────────┘
```

- Each row: drag handle (⠿) + category name (inline editable on tap) + delete icon
- Drag-to-reorder sets `sort_order` — this order controls the home category strips and filter tab sequence
- "Add category" opens a bottom sheet / inline input: type name → Save
- Delete: confirm dialog if any products are assigned to that category ("3 products use this category. Reassign before deleting.")
- Empty state: "You haven't added any categories yet. Add one to organise your products." + Add CTA

**Design notes:**
- Inline rename: tap category name → becomes an input field, blur/Enter to save
- No nested categories (flat list only in V1)
- Max 20 categories per tenant (enforced, with a friendly nudge at 18)

---

### 4.11 Tenant Admin — Orders (`/admin/orders`)

**Filter tabs:** All | Pending | Confirmed | Shipped | Delivered

**Order card:**
```
#ORD-1234 · 23 Jun · 10:32am
Priya Rajan — 2 items
Kurti (M) + Saree (Free)          ₹1,850
[Confirmed ▾]  [Enter tracking ID]
```

**Status update:** Tap status badge → bottom sheet with options (Confirm / Mark Shipped / Mark Delivered / Cancel)

**Tracking ID:** Inline input field, shows when status = Shipped

---

### 4.12 Tenant Admin — Settings (`/admin/settings`)

**Sections:**

**Store details**
- Store name, tagline, about text, contact phone, contact email

**Brand**
- Logo upload
- Primary colour picker (live preview button)

**Payment gateway**
- Current provider shown
- Change provider flow (same as onboarding step 4)

**WhatsApp**
- Phone number input
- Toggle: show WhatsApp button on storefront

**Notifications**
- Toggle: email me on new order
- Toggle: (V1.5) WhatsApp me on new order

---

## 5. Mobile-First Constraints

| Constraint | Value |
|---|---|
| Min viewport | 375px |
| Target viewport | 390px (iPhone 14) |
| Touch targets | Min 44×44px |
| Font minimum | 14px body, 12px labels |
| Bottom nav clearance | 80px (iOS home indicator) |
| Max content width | 480px on mobile, 1200px on desktop |
| Tap feedback | Scale 0.97 on active state |

**Bottom navigation (storefront, mobile only):**
```
[Home] [Shop] [Wishlist] [Orders] [Account]
```

**Admin bottom navigation (mobile only):**
```
[Dashboard] [Products] [Orders] [Settings]
```

---

## 6. Accessibility Requirements

- All interactive elements: min 44×44px touch target
- Colour contrast: WCAG AA minimum (4.5:1 text, 3:1 UI)
- All images: descriptive alt text
- Form inputs: visible labels (not placeholder-only)
- Error states: text + colour (never colour alone)
- Focus indicators: visible on keyboard navigation
- Loading states: skeleton screens (not spinners where possible)
- Success/error: Toast notification + accessible `role="status"`

---

## 7. Motion & Animation

| Interaction | Animation | Duration |
|---|---|---|
| Page transition | Fade + slight Y translate | 200ms ease |
| Cart drawer open | Slide from right | 250ms ease-out |
| Filter drawer open | Slide from bottom | 300ms ease-out |
| Product card hover | Scale 1.02 (desktop only) | 150ms |
| Add to cart | Button pulse + cart icon bounce | 300ms |
| Onboarding step change | Slide left/right | 200ms ease |
| Toast notification | Slide from top | 250ms spring |
| Confetti (go live) | Burst animation | 1500ms |

**Reduce motion:** Respect `prefers-reduced-motion` — all animations fall back to instant or simple fade.

---

## 8. Empty States

Every list/grid must have a designed empty state:

| Screen | Empty State |
|---|---|
| Shop (no products) | Illustration + "No products yet" + "Check back soon" |
| Orders (no orders) | Illustration + "No orders yet" + "Share your store" link |
| Wishlist (empty) | Heart illustration + "Save items you love" |
| Admin products (none) | Illustration + "Add your first product" CTA button |
| Admin orders (none) | Illustration + "Share your store to get your first order" |
| Search (no results) | "No results for '{query}'" + "Try different keywords" |

---

## 9. Design File Contribution Guidelines

### Preferred Tools
- **Figma** (primary — use auto-layout, components, variables)
- **Penpot** (open source alternative — fully accepted)

### File Structure
```
Talam Design/
├── 00 - Design System/
│   ├── Colours & Typography
│   ├── Spacing & Grid
│   └── Component Library
├── 01 - Storefront/
│   ├── Mobile Frames
│   └── Desktop Frames
├── 02 - Admin Panel/
│   ├── Mobile Frames
│   └── Desktop Frames
├── 03 - Onboarding/
│   └── 5-Step Wizard
└── 04 - Marketing Site/
    └── talam.app landing page
```

### Naming Convention
- Frames: `[Section] / [Page] / [State]` → e.g. `Storefront / Product Detail / Out of Stock`
- Components: PascalCase → `ProductCard`, `SizeSelector`, `OrderStatusBadge`
- Variants: descriptive → `size=M, state=selected, stock=available`

### What to Submit
- Figma share link (view access) via GitHub issue
- OR exported SVG/PNG frames for review
- Include mobile + desktop frames for each page
- Note which components are new vs extended from shadcn/ui

### How to Contribute
1. Open a GitHub issue: `[Design] Page/Component Name`
2. Tag it: `design`, `good first issue` (for single components) or `design:feature` (for full pages)
3. Share your Figma link or attach design files
4. A maintainer reviews and provides feedback within 48 hours

---

## 10. Design Tokens (CSS Variables Reference)

Designers: these are the exact variable names used in the codebase. Use them in your annotations so developers can implement without guessing.

```css
/* Store theming (set per tenant) */
--store-primary         /* Main action colour — buttons, links, badges */
--store-primary-hover   /* Darker shade for hover */
--store-primary-text    /* Text on primary background (white or black) */
--store-font-heading    /* Store heading font family */
--store-font-body       /* Store body font family */

/* Talam platform UI */
--brand-primary         /* #4F3FF0 — platform indigo */
--brand-secondary       /* #F59E0B — platform amber */

/* Layout */
--header-height         /* 60px mobile, 72px desktop */
--bottom-nav-height     /* 64px mobile only */
--content-max-width     /* 1200px */
--sidebar-width         /* 280px (admin desktop) */
```

---

## 11. What We Need Most (Priority Order)

1. **Storefront — Product Detail page** (highest conversion impact)
2. **Tenant Admin — Mobile dashboard** (most used by store owners)
3. **Onboarding wizard** (first experience — sets expectations)
4. **Checkout flow** (trust = conversion)
5. **talam.app marketing landing page** (acquisition)
6. **Empty states** (polish, delight)
7. **Illustration set** (empty states, onboarding, success screens)

---

*Thank you for contributing to Talam. Every design contribution directly helps a small business owner in India get online faster.*
