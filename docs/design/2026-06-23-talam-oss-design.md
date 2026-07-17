# Talam — Open Source Design Spec

**Date:** 2026-06-23
**Last updated:** 2026-07-17
**Status:** Open for Contribution
**Version:** 1.10 (Onboarding grew to 7 steps + persistence; new /welcome hub — not yet Paper-verified)
**For:** UI/UX designers contributing to the Talam open source project

> **Design source of truth:** Real design work now happens in a Paper Design file (`Talam Design`, 6 pages: Store Front, Marketing, Checkout Flow, Design Library, Admin Dashboard, Onboarding). The Admin Dashboard page alone has grown to 22 artboards (Dashboard, Products, Orders + order details/action menu, Settings + 7 Store Settings sub-pages, Product Editor, filter/modal overlays) — far more than §4.8–4.12 below describe; the Checkout Flow page has 7 (3 steps × mobile/desktop + a mobile-only Order Confirmed screen). This document's brand/typography/spacing/radius tokens (§2) and the design tokens reference (§10) have been re-synced to that file's live token set as of 2026-06-30. §4.5, §4.7, and §4.8 have been re-verified against their live artboards (see changelog notes); §4.1–4.4, §4.6, and §4.9–4.14 are still the original written brief and have **not** been individually re-verified against each Paper artboard — treat them as design intent, not a guaranteed pixel match. For current per-screen build status, see [`docs/2026-06-28-PAPER-DESIGN-INVENTORY.md`](../2026-06-28-PAPER-DESIGN-INVENTORY.md) (**note: this file does not currently exist in the repo** — recreate it before relying on it).

**Changelog v1.10 (2026-07-17)**
- **NOT PAPER-VERIFIED — code moved ahead of design:** the onboarding wizard shipped in code (`docs/superpowers/specs/2026-07-17-onboarding-v2-design.md`) grew from the 5 steps §4.7 describes to **7 steps** (per-step accent colors added: Store, Brand, Contact & Address, Your Story, Product, Payment, Go Live), and every step now persists immediately to `Tenant`/`StoreBranch`/`Product` via owner-scoped Server Actions instead of writing only at Go Live — a returning owner resumes at their last completed step rather than restarting. §4.7 below still documents the old 5-step artboards and has **not** been re-verified against updated Paper artboards for the new 2-step split (Contact & Address, Your Story) — treat §4.7 as stale until that verification pass happens.
- **NEW route, no Paper artboard yet:** `/welcome` — a hub page signed-in owners land on from every marketing CTA (nav avatar, hero, CTA band, pricing), showing either "Continue setup" or "View My Store"/"View Admin" depending on `Tenant.isOnboarded`. No Paper page exists for this screen; the shipped layout (`app/welcome/page.tsx`) is a plain centered card, not a designed artboard. Flagged here rather than invented as a spec section.
- **Marketing CTAs (nav, hero, CTA band, pricing) are now state-aware** for signed-in owners — see `docs/2026-06-23-talam-design.md` Changelog v1.10 for the full behavior. No corresponding Paper artboards exist for the signed-in nav/hero/CTA states either; this doc's Marketing page section (not itemized above — Marketing lives in the Paper file, not narrated section-by-section here) should be re-verified alongside §4.7 once Paper catches up.

**Changelog v1.9 (2026-07-11)**
- **REWROTE:** §4.7 Onboarding Wizard re-verified against the live `Onboarding / Mobile — Step 1..5` Paper artboards. Corrections: Step 3 (product) collects **Product photo, Price (₹ prefix), and Stock quantity** — not a Category dropdown or Size checkboxes, which don't exist on that artboard. Step 4 payment methods are ordered **UPI, Razorpay, Instamojo** (not UPI/Instamojo/Razorpay) with a "💡 Pro tip" callout instead of an inline setup-fields note. Step 5 is a **completion checklist** (4 done-items: store/brand/product/payment) plus a "💡 Next steps" callout and a **"Go Live →"** primary CTA — not a WhatsApp-share/copy-link screen. Steps 1–3 footer includes a **Skip** button between Back and Next (step 4 has none, matching the live artboards).
- Implementation updated to match: [`app/admin/onboarding/product-step.tsx`](../../app/admin/onboarding/product-step.tsx), [`payment-step.tsx`](../../app/admin/onboarding/payment-step.tsx), [`go-live-step.tsx`](../../app/admin/onboarding/go-live-step.tsx), [`page.tsx`](../../app/admin/onboarding/page.tsx).

**Changelog v1.8 (2026-07-11)**
- **REWROTE:** §4.1c Settings restructured from a single-page accordion (Addresses/Payment Methods/Notifications/Account all inline) into a nav-list **hub** at `/account` plus four subpages with `Settings › <Section>` breadcrumbs: `/account/addresses`, `/account/payment-method`, `/account/notifications`, `/account/actions`. The Account subpage route is `/account/actions` (not `/account/account`) to avoid a duplicated path segment — its breadcrumb still reads "Settings › Account".
- **NEW:** Account subpage gains a readonly profile summary (name/phone/email, no edit) above the action rows, and a third action, **Deactivate Account** (neutral styling), alongside the existing Log Out / Delete Account.
- **CHANGED:** Desktop sidebar gains a fifth nav item, **Account**, and now serves as the sole navigation for the settings area — each item routes to its own subpage instead of jumping to an inline anchor on one long page.
- Fixed a layout bug caught in review: an early build of the hub's new "SETTINGS" nav-list section was left `position: absolute`, causing it to float on top of and visually hide the Preferences/Support sections below it — corrected to sit in normal document flow between "My Activity" and "Preferences".

**Changelog v1.7 (2026-07-11)**
- **REWROTE:** §4.1b re-verified against the live `Account Settings — Mobile`, `Settings — Desktop`, `Edit Profile — Mobile`, and `Edit Profile — Desktop` Paper artboards. Profile editing is no longer part of the Settings page — it's a dedicated Edit Profile screen, reached only through the Account Menu's "Profile" row. Settings itself was rebuilt from a sidebar-tab-switcher (Profile/My Orders/Addresses/Payments/Notifications) into a single-page accordion of three sections: Addresses, Payment Methods, Notifications.
- **NEW:** §4.1c documents the Settings page content in full — Addresses and Payment Methods were previously placeholder rows with no underlying screen (`href="/"`); they're now built out with real card content, Default/Edit/Delete/Set-as-Default actions, and "+ Add" modals.
- **NEW:** §4.1d documents the new Edit Profile screen — Full Name, Phone Number (locked, non-editable), Email Address, Save/Cancel.
- **FIXED:** The two independent notification-toggle sets (2 toggles on the old mobile Preferences block vs. 3 differently-colored toggles on desktop) are unified into one 3-toggle set — Deals / Order Updates / Promotions — with a single toggle color (`--color-success`) at every breakpoint.
- **CHANGED:** Account Menu (Signed In) — Mobile gains a third action row, **Orders**, between Profile and Settings. Account Menu (Signed In) — Desktop is unchanged (still Profile / Settings / Log Out) — this asymmetry is intentional, not a missed sync.
- **REMOVED:** "My Orders" row from the Settings page (both breakpoints) — redundant with the dedicated Orders route/nav entry.

**Changelog v1.6 (2026-07-04)**
- **REWROTE:** §4.5 Checkout re-verified against the live `Step 1/2/3 — Mobile/Desktop` Paper artboards. Corrections: the order summary, coupon field, and trust bar are **always visible on every step** (not a collapsible toggle confined to Address); the OTP step also offers **"Continue with Google"** (previously undocumented); the Address form has **no Email field** in the live design; Payment shows a non-editable Delivery Address recap card; and there are two distinct CTAs (the UPI card's own "Confirm Payment" vs. the page-level "Place Order").
- **NEW:** §4.5a Order Confirmed screen documented — this whole post-payment screen (order ID, delivery estimate, order recap, Track/Share/Continue CTAs) existed in Paper with zero spec coverage until now. Mobile-only artboard; no desktop version exists yet. Flagged a copy inconsistency: this screen says "30-day hassle-free return" while the checkout trust bar says "Easy 7-day returns."

**Changelog v1.5 (2026-07-04)**
- **REWROTE:** §4.8 Admin Dashboard re-verified against the live `Admin Dashboard / Mobile` and `Admin Dashboard / Desktop` Paper artboards. Several sections existed in the design but were never specced: a **Today/Yesterday/This Week/This Month time filter row**, an **Action Required alerts section** (pending orders, low stock, failed payments), and a **Revenue Trend chart** with a Revenue/Orders/Customers series toggle. The desktop layout was corrected from "max-width 960px, centered" to a **persistent left sidebar app shell** (Overview/Orders/Products/Customers/Settings) with a 2-column content split — desktop has no bottom nav. The flat "Product rows" list was replaced with the actual "Top Products" card row design.

**Changelog v1.4 (2026-07-04)**
- **CHANGED:** Account Menu logged-out state simplified from two rows ("Log In" / "Sign Up") to a single "Log in / Sign up" row — both led to the same `Auth` screen, so the second row was redundant.
- **NEW:** Account Menu logged-in state designed — profile icon becomes an initial avatar; dropdown shows an identity header (name + phone) followed by Profile, Settings, and Log Out (danger colour) rows. New artboards: `Account Menu (Signed In) — Mobile`, `Account Menu (Signed In) — Desktop`. See updated §4.1b.

**Changelog v1.3 (2026-07-03)**
- **NEW:** Auth / Login flow designed and added to the Store Front page — clicking the profile icon in the header opens an `Account Menu` dropdown (Log In / Sign Up), which leads to a single unified `Auth` screen (mobile number field + "Continue" OTP CTA + "Continue with Google"), matching Myntra/Flipkart-style phone-first login. Built for both mobile and desktop (4 new artboards: `Account Menu — Mobile`, `Account Menu — Desktop`, `Auth — Mobile`, `Auth — Desktop`). This closes the `/auth` gap flagged in the 2026-07-03 design audit. See new §4.1b.
- **REMOVED:** The pincode/delivery-estimate widget ("Check Delivery Date" input + "Get it by…" text) removed from Product Detail — Mobile. It was already absent on Desktop, so both breakpoints are now aligned. §4.3 updated.
- **FIXED:** Wishlist — Desktop now matches Wishlist — Mobile: added the filter tab row (All Items / In Stock / Price ↑ / On Sale) and a "Share" button next to the sort control, both previously mobile-only. §4.6a updated.
- **NEW:** Store About — Desktop artboard added (previously mobile-only) — founder profile + stats, Our Story, Follow Us, Visit Us branch cards, all in a two-column desktop layout consistent with the rest of the storefront's desktop pages. §4.1a updated.

**Changelog v1.2 (2026-06-30)**
- Colour, typography, spacing, and border-radius tokens (§2) replaced with the actual token set exported from the live Paper file (single unified `--color-*` namespace, not split admin/storefront blocks)
- §10 Design Tokens reference rewritten to use the real token names/values from Paper instead of placeholder semantic names
- `TrialBanner` component removed from §3 — trial banner was cut from the admin dashboard spec
- Admin bottom navigation corrected from 4 items to 5 (`Dashboard, Products, Orders, Customers, Settings`) — confirmed live in both mobile and desktop Admin Dashboard artboards
- Onboarding wizard step count corrected from "6-step" to 5-step in §3 (the wizard itself, §4.7, was already correct)

**Changelog v1.1 (2026-06-25)**
- Domain updated: `talam.app` → `talam4shop.com` throughout
- Added `/shop/[categorySlug]` SEO route to storefront section
- Added `talam4shop.com/pricing` and `talam4shop.com/join` to marketing site scope
- **NEW:** Storefront `/about` page — store story, owner photo, social links, trust stats, branch locations
- **NEW:** Storefront `/wishlist` page design specs
- **NEW:** Product reviews UI — individual review cards, verified purchase badges, review filtering, report mechanism
- **NEW:** Admin `/admin/about` page — store story editor, social links, branch CRUD
- **NEW:** Admin `/admin/reviews` page — moderation dashboard (all reviews + reported reviews tabs)
- **NEW:** Product categories in home and shop filters (dynamic, owner-defined, reorderable)
- **NEW:** Trust badges on product detail (free delivery, return window, custom trust text)

---

## Welcome, Designer

Talam is an open-source multi-tenant e-commerce SaaS platform built for Indian small businesses. We are looking for design contributions across two surfaces:

1. **Storefront** — what customers see when they visit a store (e.g. `silk.talam4shop.com`)
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

> **Source:** live token set exported from the Paper design file, Design Library page (44 tokens total, content hash `42f27fdd` as of 2026-06-30). Talam uses one unified token namespace for both Admin and Storefront — not separate colour systems — with `--color-store-primary` as the one themable-per-tenant value.

```css
--color-fg:              #18181B   /* Foreground text */
--color-muted:            #8B7D7A  /* Secondary text (warm muted, not cool gray) */
--color-border:           #E8E8E8  /* Default borders, dividers */
--color-border-light:     #F0F0F0  /* Lighter dividers */
--color-surface:          #FFFFFF  /* Cards, panels */
--color-bg:               #F9F9F9  /* Page background */
--color-bg-dark:          #1A1A1A  /* Dark sections (hero, about) */
--color-store-primary:    #E8577E  /* Themable per tenant — example value shown */
--color-amber:            #F59E0B  /* Accent, warmth */
--color-danger:           #EF4444  /* Destructive, errors */
--color-success:          #10B981  /* Positive actions */
--color-success-bg:       #F0FDF4  /* Success banner background */
--color-success-border:   #BBEDD4  /* Success banner border */
--color-brand-primary:    #4F3FF0  /* Talam platform indigo */
```

**Store theming:** Each store owner sets `--color-store-primary` during onboarding. This colour drives all primary actions (buttons, links, badges, active states). The live design file uses `#E8577E` (pink) as its example — earlier drafts of this spec used `#C2185B` (rose); either is a valid example value, the token is what matters.

**Not yet tokenized but used in copy/spec text below:** `--wa` (#25D366, WhatsApp brand colour) and `--sale`/`--new` badge colours are referenced throughout §4 but don't have dedicated Paper tokens yet — they currently reuse `--color-danger` and `--color-success`.

### Typography

> **Source:** live Paper token set. Font sizes, weights, tracking, and line-heights below are exact `--text-*` / `--font-weight-*` / `--tracking-*` / `--leading-*` tokens — not approximations.

```css
--font-heading: "Playfair Display", system-ui, serif        /* Storefront headings — elegant, ethnic */
--font-body:    "DM Sans", system-ui, sans-serif             /* Storefront body — clean, readable */
--font-admin:   system-ui, sans-serif                        /* Admin panel UI */
```

Fonts loaded in the design file: System Sans-Serif, Playfair Display, DM Sans, System Monospace.

**Font sizes (`--text-*` tokens, px):**
```
--text-2xs:  11px   /* Smallest captions */
--text-xs:   12px   /* Labels, badges, captions */
--text-sm:   13px   /* Button text, filter labels */
--text-md:   14px   /* Body text, small descriptions */
--text-base: 16px   /* Body text default, section headings */
--text-lg:   18px   /* Page titles on mobile */
--text-xl:   20px   /* Product names, large headings */
--text-2xl:  28px   /* Hero / modal titles */
```
*(Earlier drafts of this spec used a 9-step scale including 15px/24px/26px — the live token set above is the 8-step scale actually in use; if you need an in-between size, check with the design file before introducing a new raw value.)*

**Font weights:**
```
--font-weight-normal:   400
--font-weight-medium:   500
--font-weight-semibold: 600
--font-weight-bold:     700
```

**Letter spacing:**
```
--tracking-normal: 0em
--tracking-wide:   0.08em   /* Uppercase labels, eyebrow text */
```

**Line heights (`--leading-*`, px):**
```
--leading-tight:   16px   /* Headings, product names */
--leading-snug:    18px   /* Labels, captions */
--leading-normal:  22px   /* Body text default */
--leading-relaxed: 24px   /* Readable body, descriptions */
--leading-loose:   34px   /* Hero titles */
```

### Spacing System (4px base)

`--spacing-*` tokens from the live Paper file:

```
--spacing-1:  4px
--spacing-2:  8px
--spacing-3:  12px
--spacing-4:  16px   /* Main padding (mobile), form fields */
--spacing-5:  20px   /* Section padding */
--spacing-6:  24px   /* Spacing between major sections */
--spacing-8:  32px   /* Large section gaps, hero padding */
--spacing-10: 40px   /* Hero padding on desktop */
```
*(Earlier drafts also listed 6px/10px/14px as named steps — those aren't tokens in the live file; they may still appear as one-off raw values in specific components, but new work should snap to the 8-step scale above.)*

### Border Radius

`--radius-*` tokens from the live Paper file:

```
--radius-sm:   4px    /* Minimal, small interactive elements */
--radius-md:   6px    /* Compact form controls, tight buttons */
--radius-lg:   8px    /* Standard cards, buttons, inputs */
--radius-xl:   10px   /* Order/product cards */
--radius-full: 999px  /* Pills (filters, badges), avatars */
```
*(Earlier drafts also listed 12px/16px/20px steps for modals and filter sheets — those aren't tokens in the live file either; larger containers currently use raw values rather than a dedicated token. Worth raising with whoever owns the Paper file if that's intentional or a gap.)*

---

## 3. Component Library

Components are built with vanilla HTML/CSS (no framework dependency). Use CSS Grid, Flexbox, and CSS custom properties for theming. Designers should reference component implementations in the prototype files for exact specifications.

> The live Paper file has a dedicated **Design Library** page with 7 component groups: Buttons & Badges, Design System (reference sheet), Navigation, Cards, Checkout Components, Storefront Sections, Admin Components. The table below is the original, more granular component brief — it has not been checked component-by-component against those 7 groups this pass, so treat it as the spec, not a confirmed inventory of what's built.

### Core Components (Prototypes Documented)

| Component | Used In | Status | Notes |
|---|---|---|---|
| **ProductCard** | Shop, Home | ✓ | 2-col mobile grid, 4-col desktop. Image, badge (Sale/New), wishlist heart, name, price, rating |
| **SizeSelector** | Product detail | ✓ | Pill buttons (XS/S/M/L/XL/XXL). Selected = filled store primary. Disabled/strikethrough if OOS |
| **CartDrawer** | Storefront | ✓ | Slides from right (fixed position). Items, quantity stepper, subtotal, checkout CTA |
| **ImageGallery** | Product detail | ✓ | Full-width mobile, swipeable with touch. Dot indicators. Desktop thumbnails below |
| **OrderStatusBadge** | Orders | ✓ | Pending (amber), Confirmed (green), Shipped (blue), Delivered (green), Cancelled (red) |
| **PaymentSelector** | Checkout | ✓ | Card UI with radio button. UPI / Instamojo / Razorpay with icons and descriptions |
| **UPIQRCode** | Checkout | ✓ | QR code placeholder + UPI ID + UTR input field |
| **SaleBanner** | Home | ✓ | Full-width dark bar with countdown timer (dismissable) |
| **FilterSheet** | Shop | ✓ | Mobile: bottom sheet with handle. Category / Size / Price / Sort sections. Apply button |
| **FilterSidebar** | Shop (desktop) | ✓ | Left sidebar with checkboxes. Price range inputs. Sort radio options |
| **OnboardingWizard** | Admin setup | ✓ | 5-step wizard with horizontal step indicator. Store → Brand → Product → Payment → Go Live. Fully designed mobile + desktop in the live file — most complete design in the project |
| **ProductEditor** | Admin products | ✓ | Modal/sheet: image upload, name, description, category, price, sizes, stock inputs, visible toggle |
| **OrderCard** | Admin orders | ✓ | Compact: order ID + time, customer name, items, amount, status button, tracking input |
| **StatCard** | Admin dashboard | ✓ | Large number + small label + trend indicator (↑/↓). 2-col mobile, 4-col desktop |
| **ThemePicker** | Admin settings | ✓ | 6 colour swatches + custom hex input. Live preview of action buttons |
| **CategoryList** | Admin categories | ✓ | Drag-reorderable rows with inline edit + delete. Add button at top |
| ~~**TrialBanner**~~ | ~~Admin dashboard~~ | **Removed** | Cut from the admin dashboard spec on 2026-06-28 — do not design or build this |
| **BottomNav** | Mobile (all) | ✓ | 5 items (Storefront) / **5 items (Admin)** — Dashboard, Products, Orders, **Customers**, Settings. Icon + label. Active state in store primary |
| **StepIndicator** | Checkout, Onboarding | ✓ | Horizontal dots: unfilled → filled on complete → checkmark. Connected line between steps |
| **ReviewCard** | Product detail, Admin reviews | ✓ | Review with rating, author, date, verified purchase badge, text, images, helpful count, report button |
| **ReviewForm** | Product detail | ✓ | Rating picker (5 stars), title input, text area, photo upload, submit button. V1: read-only display only |
| **ReviewRatingBreakdown** | Product detail | ✓ | 5-row breakdown: ★★★★★ (count), ★★★★ (count), etc. Tap to filter |
| **StoreBranchCard** | `/about`, Admin | ✓ | Branch name, address, phone, maps link button. Reorderable in admin |
| **StoreBranchEditor** | `/admin/about` | ✓ | Modal form: name, address, city, phone, maps URL inputs. Create/edit/delete actions |
| **SocialLinkInput** | `/admin/about` | ✓ | Platform icon + URL input. Instagram, Facebook, YouTube, Google Business. Add more button |
| **StoreAboutSection** | `/about` | ✓ | Owner photo, story text, trust stats, social links, branches list |
| **ReportReviewModal** | Product detail | ✓ | Bottom sheet: reason radio buttons (Spam, Inappropriate, Fake, Other), details textarea, submit |
| **ReviewActionMenu** | Admin reviews | ✓ | Dropdown: Hide, Delete, Mark verified, Pin, Contact (V2). Bulk actions checkbox |
| **AccountMenu** | Storefront header | ✓ *(new 2026-07-03)* | Dropdown anchored under the header profile icon: "Log In" and "Sign Up" rows, icon + label each. Mobile and desktop variants |
| **AuthForm** | `/auth` | ✓ *(new 2026-07-03)* | Unified login/signup: mobile-number field (+91 prefix), "Continue" CTA (store primary), divider, "Continue with Google" button, terms text. One screen serves both Log In and Sign Up — no separate OTP-entry step designed yet |

---

## 4. Page-by-Page Design Requirements

### 4.1 Storefront — Home (`/`)

**Purpose:** First impression. Converts WhatsApp link clickers to browsers to buyers.

**Layout (top to bottom):**

1. **Sale banner** (if active) — Full-width dark bar, countdown timer, dismissable close button
2. **Header** — Sticky, height 60px (mobile) / 72px (desktop)
   - Left: Store logo (serif heading, name with dot in store primary colour)
   - Center (desktop only): Nav links (Shop, About)
   - Right: Search icon, Wishlist icon, Cart icon (with badge count), Account icon
     - Logged-out state: tapping the Account icon opens the `AccountMenu` dropdown (Log In / Sign Up) — see §4.1b
3. **Hero section** — Full-width, min-height 56vw mobile (max 560px), 460px desktop
   - Background: Dark gradient (#5C1230 → #2d1b69) with warm overlay glow
   - Content: Hero eyebrow (uppercase, amber), headline (clamp 26–48px), description, CTA button
   - Desktop only: Model illustration on right (fade from amber to brown)
4. **Chip rail** — Horizontal scrollable category filters (All, Kurtis, Sarees, Tops, etc.)
   - Active chip: filled store primary background + white text
5. **Category section** — "Shop by Category" with horizontal scroll cards
   - Each card: image (gradient placeholder), label overlay at bottom
   - Hidden if tenant has no categories defined
6. **New arrivals grid** — 2-col mobile, 4-col desktop
   - Each card: image, badge (Sale/New), wishlist heart, name, price, rating
7. **Editorial section** — "Festival Edit" full-width card with warm background
   - Title, subtitle, "Shop the Edit →" link
8. **About section** — Dark background (#1A1040), warm text
   - Eyebrow (amber), headline, paragraph (max 65 characters width)
9. **Footer** — Light, links (Shop, About, Contact, Shipping, Returns), "Powered by Talam" badge
10. **WhatsApp FAB** — Green, bottom-right (fixed on mobile, positioned absolute on desktop), always visible above bottom nav

**Mobile navigation (fixed bottom):**
Home | Shop | Wishlist | Orders | Account (5 items, 64px height)

---

### 4.1a Storefront — About (`/about`)

**Purpose:** Build trust and connection. Show store owner story, social presence, branch locations, and key metrics.

**Layout (top to bottom):**

1. **Header** — Sticky, 60px height
   - Back arrow, store name + tagline (14px muted)
   - Share icon (for WhatsApp/social sharing)

2. **Owner section** — Padding 20px
   - Owner photo (120×120px circle, border 2px store primary, centered)
   - Name (18px bold, centered)
   - Title/role (13px muted, centered, e.g. "Founder & Designer")

3. **Story section** — Padding 20px, border-top 1px
   - Heading: "Our Story" or "About Us"
   - Long-form description text (14px, line-height 1.6)
   - Markdown/rich text support for formatting

4. **Trust stats** — Padding 16px, background light
   - 3-column grid (or flex wrap on small screens)
   - Each stat: large number (20px bold) + label (12px muted)
   - Examples: "₹50L+ GMV", "2K+ Customers", "98% Rated"

5. **Social links section** — Padding 20px, border-top 1px
   - Heading: "Follow Us" or "Connect"
   - Button row (flex wrap, gap 12px):
     - Instagram, Facebook, YouTube, Google Business
     - Each: 40×40px circle buttons with platform icons
     - Inactive: muted border, clickable to platform

6. **Branch locations section** — Padding 20px, border-top 1px
   - Heading: "Visit Us"
   - Branch cards (flex column, gap 12px):
     - **Branch card:** border 1px, border-radius 8px, padding 14px
       - Branch name (14px bold)
       - Address (12px muted, line-height 1.5)
       - Phone (12px, store primary text with phone icon)
       - Maps link button (12px, outlined border, "View on Maps →")

7. **Footer** — Light, padding 16px
   - "Powered by Talam" badge + link

**Desktop layout:**
- *(Live in Paper as of 2026-07-03 — previously mobile-only.)* Two-column layout within a 1200px content width (consistent with the other desktop storefront pages, not a centered 640px column as originally drafted): a 360px profile column (owner photo, name, role, stats) alongside a flexible "Our Story" + "Follow Us" column
- Owner photo 140×140px
- Trust stats: horizontal 3-column grid, inside the profile column
- Branch cards: 2-column grid for 2+ branches, full-width below the identity row
- Header, nav, and footer are cloned from the same components used on Home/Product Detail/Cart Desktop for consistency; "About" nav link shown active (store primary colour)

---

### 4.1b Storefront — Account Menu & Auth (`/auth`)

**Purpose:** Let a visitor log in or create an account without leaving the current page context. Added 2026-07-03 to close a gap where no auth screens existed in the Paper file.

**Trigger:** Tapping/clicking the profile icon in the storefront header (top-header icon on both mobile and desktop). The icon and menu contents differ by session state — see below.

**Account Menu — logged-out state:**
- Anchored under the profile icon, right-aligned
- Card: white surface, 1px border, `--radius-lg`, subtle drop shadow
- Profile icon: generic person-outline glyph, muted grey chip background
- **Single row** (updated 2026-07-04 — previously two separate "Log In" / "Sign Up" rows): "Log in / Sign up", arrow-into-door icon, 14px medium text. One row instead of two because both destinations are the same `Auth` screen (see below) — no reason to make the visitor pick a label before they've even seen the form
- Profile icon shows an active/highlighted background (light store-primary tint) while the menu is open

**Account Menu — logged-in state (updated 2026-07-11):**
- Profile icon becomes a filled avatar: store-primary circle with the customer's first-initial, replacing the outline glyph
- Card is taller, three sections top to bottom:
  1. Identity header — small avatar (initial) + customer name (14px semibold) + phone number (12px muted), non-interactive
  2. Hairline divider, then action rows, 14px medium text, `--color-fg`:
     - **Mobile** — three rows: **"Profile"** (person icon) → Edit Profile screen, **"Orders"** (bag icon) → `/orders`, **"Settings"** (gear icon) → the Settings hub. Orders was added 2026-07-11 as a direct shortcut; it does not exist on desktop.
     - **Desktop** — two rows: **"Profile"** → Edit Profile screen, **"Settings"** → the Settings hub. No Orders row — desktop reaches Orders via the header's own Orders affordance, so a third dropdown row was judged redundant.
     - **Profile and Settings are two distinct destinations** (changed 2026-07-11 — previously, per the 2026-07-04 decision, both rows routed to the same combined `/account` page). "Profile" opens the dedicated Edit Profile screen (§4.1d); "Settings" opens the Settings hub (§4.1c). They no longer share a screen.
  3. Hairline divider, then **"Log Out"** row — same row styling but icon + text in `--color-danger` to visually separate it as the exiting action
- Mobile and desktop use the same card structure, anchored to each header's own icon position

Both states are live in Paper as `Account Menu — Mobile`, `Account Menu — Desktop`, `Account Menu (Signed In) — Mobile`, and `Account Menu (Signed In) — Desktop`.

---

### 4.1c Storefront — Settings (`/account`, `/account/addresses`, `/account/payment-method`, `/account/notifications`, `/account/actions`)

**Purpose:** Manage saved addresses, payment methods, notification preferences, and account-level actions. Reached via the Account Menu's "Settings" row or the mobile bottom nav's "Settings" tab (same route, gear icon instead of a person glyph).

**Not on this page:** Profile editing (name/phone/email) — that's a separate screen, see §4.1d. "My Orders" was removed from Settings 2026-07-11 as a duplicate entry point; Orders has its own route and its own nav/menu presence.

**Restructured 2026-07-11 (v1.8): accordion → hub + four subpages with breadcrumbs.** The single long accordion page (Addresses/Payment Methods/Notifications/Account all inline and expanded) is gone. `/account` is now a nav-list **hub**; Addresses, Payment Method, Notifications, and Account each get their own subpage reached from that hub, with a `Settings › <Section>` breadcrumb at the top. Route names deliberately avoid the `account/account` duplication — the Account subpage lives at `/account/actions`, with the breadcrumb still reading "Settings › Account".

**Hub (`/account`) — both breakpoints:**
- Mobile: profile card, then a "MY ACTIVITY" section (Wishlist, Reviews — unchanged), then a new **"SETTINGS"** nav-list section with four rows — **Addresses** (map-pin icon, "N addresses saved"), **Payment Method** (card icon, default method preview), **Notifications** (bell icon, "Deals, order updates, promotions"), **Account** (user icon, "Log out, deactivate, or delete") — each row has a chevron and routes to its subpage. Preferences (Language) and Support sections remain below, unchanged.
- Desktop: the existing left sidebar (profile card + nav) gains a fifth item, **Account**, alongside Profile / Addresses / Payments / Notifications — the sidebar itself now serves as the primary navigation, and the active item is highlighted per subpage. Each sidebar item (other than Profile) routes to its own subpage rather than jumping to an inline anchor.

**Subpages (breadcrumb `Settings › <Section>` + single section content):**

1. **Addresses** (`/account/addresses`)
   - Header row: "Addresses" title + "+ Add New Address" button (opens a modal/bottom-sheet, not a separate page)
   - Hint banner directly below the header: amber/warning-tinted, info icon, *"One default address is required to place orders."*
   - One card per saved address: name label ("Home", "Office"), a `DEFAULT` badge (success-green pill) on the default address only, full address text, phone number, and an action row — `Edit` / `Delete` on the default address, `Set as Default` / `Edit` / `Delete` on others
   - Desktop shows address cards two-up in a row; mobile stacks them full-width

2. **Payment Method** (`/account/payment-method`)
   - Header row: "Payment Method" title + "+ Add Payment Method" button (modal/bottom-sheet)
   - One card per saved method: card brand + masked number + expiry + `DEFAULT` badge for the default card, or a UPI ID for UPI methods; action row is `Remove` (default) or `Set as Default` / `Remove` (others)
   - Same two-up (desktop) / stacked (mobile) card layout as Addresses

3. **Notifications** (`/account/notifications`)
   - Three toggle rows in a card, each with a label + one-line description + a switch: **Deals** ("Offers, discounts, and new drops"), **Order Updates** ("Shipping and delivery updates"), **Promotions** ("Flash sales and limited-time deals")
   - All three use one toggle color (`--color-success`) for the "on" state
   - Still schema-less/inert — no `tenants` or `customers` column backs these switches yet; wiring them up is unscoped (see §12-equivalent gap in the product spec)

4. **Account** (`/account/actions`)
   - Readonly profile summary card at the top — name, phone, email, no edit affordance (editing still only happens on the dedicated Edit Profile screen, §4.1d)
   - Three distinct action rows in a card, in order: **Deactivate Account** (new 2026-07-11, neutral styling, "Temporarily hide your account") / **Delete Account** (danger, "Permanently remove your data") / **Log Out** (danger). Previously Log Out and Delete Account were the only two actions, inline at the bottom of the single long page; Deactivate is a new addition and all three now live together on this subpage instead of inline on the hub.

Live in Paper (Store Front page) as: `Settings — Mobile (Hub)`, `Addresses — Mobile`, `Payment Method — Mobile`, `Notifications — Mobile`, `Account (Actions) — Mobile`, and their desktop counterparts `Addresses — Desktop`, `Payment Method — Desktop`, `Notifications — Desktop`, `Account — Desktop` (desktop hub is the original `Settings — Desktop` artboard, sidebar updated to 5 items). Supersedes the old single `Account Settings — Mobile` / `Settings — Desktop` accordion artboards referenced in v1.7.

---

### 4.1d Storefront — Edit Profile

**Purpose:** Edit the fields that used to live in Settings' "Personal Information" card, now split into its own screen. Reached only from the Account Menu's "Profile" row (§4.1b) — there is no link into this screen from within Settings itself besides the sidebar "Profile" jump link on desktop.

**Fields:**
- **Full Name** — editable text input
- **Phone Number** — locked/read-only: greyed input background, a lock icon on the right, and a caption below reading "Phone number cannot be changed." Phone is the OTP login identity, so it's intentionally not self-service editable.
- **Email Address** — editable text input

**Layout:**
- Avatar block at the top (gradient circle + initial, "Change Photo" link below it) — mobile centers this under a back-arrow header titled "Edit Profile"; desktop puts it inside the same card as the form fields, to the left of the name, above the fields
- Desktop wraps the whole form in a single centered card (640px) with a page title + subtext above it ("Edit Profile" / "Update your personal information") and `Cancel` / `Save Changes` buttons bottom-right
- Mobile is full-bleed fields down the screen with a single full-width `Save Changes` button pinned above the safe area

Live in Paper as `Edit Profile — Mobile` and `Edit Profile — Desktop` (both new 2026-07-11).

**Auth screen (single screen for both Log In and Sign Up):**
- Rationale: the product spec's OTP flow (mobile number → OTP → session) doesn't distinguish new vs. returning users until after the phone number is verified, so one screen covers both entry points — avoids building near-duplicate Log In / Sign Up screens
- Mobile: status bar, back button, heading "Log in or Sign up" (Playfair Display, 28px) + one-line subtext
- Desktop: same content in a centered card (420px wide) on a light background, logo mark at the top of the card instead of a back button
- Mobile Number field: label, then a bordered input row with a country-code chip ("+91") on the left and the number field on the right
- Primary CTA: "Continue" button, full-width, store primary background
- Divider: "or"
- Secondary CTA: "Continue with Google" — outlined button with the multicolour Google "G" mark and label text
- Footer: muted terms text ("By continuing, you agree to Talam's Terms of Service and Privacy Policy")
- **Not yet designed:** the OTP-entry step (4-digit code input) that follows "Continue" — only the phone-number capture screen exists today

---

### 4.2 Storefront — Shop (`/shop`)

**Purpose:** Product discovery. Filter and browse.

**Routes:**
- `/shop` — main product listing with filter controls
- `/shop/[categorySlug]` — pre-rendered category page (e.g. `meenasilks.mytalam.app/shop/sarees`). Same layout, pre-filtered by category name in page heading.

**Mobile layout:**
1. **Header** — Sticky, back arrow, "Shop" title, search icon
2. **Filter bar** — Horizontal scrollable chips
   - Filter chip (icon + "Filters" + count badge) on left
   - Category chips (Kurtis, Sarees, Tops)
   - Sort chip (right-aligned, "Newest" by default)
3. **Results bar** — "Showing X products" + filter summary
4. **Product grid** — 2-column, 1px gap (grid background shows gap)
   - Each card: 2:3 aspect ratio image, badges (top-left), wishlist heart (top-right), name, price, rating
5. **Filter sheet** (bottom sheet, on demand)
   - Handle bar at top
   - Title: "Filters" + "Reset all" button + close button
   - Sections: Category (buttons), Size (buttons), Price (min/max inputs), Sort (buttons)
   - Footer: Cancel + "Show X products" apply button

**Desktop layout:**
1. **Header** — Same as above, 72px height
2. **Shop grid** — 240px left sidebar (fixed) + main content
3. **Sidebar** — Sections with checkboxes: Category, Size, Price range, Sort radio
4. **Product grid** — 3-column, bordered cells
5. **Results bar** — Above grid, "Showing X products"

**Filter options:**
- **Category** — Dynamic from `product_categories`, ordered by `sort_order`. Shows "All" first if categories exist.
- **Size** — XS / S / M / L / XL / XXL (multi-select buttons, greyed/strikethrough if no stock)
- **Price range** — Min/Max number inputs
- **Sort** — Newest First (default) / Price: Low to High / Price: High to Low

---

### 4.3 Storefront — Product Detail (`/product/[slug]`)

**Purpose:** Conversion. Detailed product view with buy controls.

**Mobile layout (top to bottom):**
1. **Header** — Sticky, 60px height, back arrow, store brand name, share icon, cart icon (with badge)
2. **Image gallery** — Full-width, 2:3 aspect ratio
   - Main image area (swipeable on touch)
   - Dot indicators below (tap to jump, active = 20px wide pill, inactive = 7px circle)
   - Share button overlay (top-right, 36px circle, white bg, 50% opacity)
   - Sale badge overlay (top-left, "20% OFF" style, red background)
3. **Product info** — Padding 20px
   - Brand name (12px uppercase, muted color, letter-spaced 0.08em)
   - Product name (24px Playfair Display, bold, line-height 1.2)
   - Rating (14px muted, e.g. "★★★★★ 248 reviews")
   - Price row (gap 10px, flex-wrap)
     - Sale price (26px bold, store primary #C2185B)
     - Original price (16px muted, strikethrough)
     - Off badge (12px bold, sale red background, white text, rounded 4px)
   - Save note ("You save ₹X on this order", 12px green, bold)
   - Tax note ("Inclusive of all taxes · Free delivery", 12px muted)
4. ~~**Pincode check**~~ — **Removed 2026-07-03.** The delivery-estimate widget ("Check Delivery Date" input + "Get it by Wed, 2 Jul…" result text) was cut from Product Detail — Mobile in the live Paper file; it was never built on Desktop, so the two breakpoints are now aligned. Do not design or build this section. Trust icons ("↩ 30-day Returns · ✓ 100% Genuine · 🔒 Secure Pay") remain, folded into the free-delivery/returns line under the price row.
5. **Size selector** — Padding 20px, border-bottom
   - Header: "Size" + "Size Guide →" link (13px, store primary)
   - Pill buttons (min-width 52px, height 44px, flex wrap, gap 8px)
   - Selected: filled store primary + white text
   - Disabled/strikethrough if out of stock
6. **Description** — Padding 20px, border-bottom, expandable
   - Title with chevron (toggles content, transition rotate 180°)
   - Body: list of details (fabric, care, occasion, fit, origin)
   - Max-height animation (0 → 300px) on open
7. **Delivery info** — Padding 16px, margin-top 1px
   - Icon + text rows (e.g. "Free delivery on orders over ₹500")
   - Icons 18px, green stroke
8. **Sticky bottom bar** (fixed, bottom 0, 80px+ clearance)
   - Flex layout, gap 12px, padding 12px 16px
   - Left: Wishlist button (52px square, outlined border)
     - Toggles: border-color muted → store primary, fills on click
   - Right: "Add to Cart" button (flex 1, 52px height, store primary, bold)
     - Active state: scale 0.98

9. **Reviews section** — Padding 20px, border-top 1px
   - Header: "Customer Reviews" (16px bold) + rating summary (e.g. "4.6 ★ · 248 reviews")
   - Quick rating breakdown (optional):
     - 5-column flex: ★★★★★ (5), ★★★★ (4), ★★★ (3), ★★ (2), ★ (1) with count badges
   - Review filters (horizontal chips):
     - "Most Relevant", "Highest Rated", "Lowest Rated", "With Photos"
     - Selected: store primary background + white text
   - Review cards (flex column, gap 12px):
     - **Individual review card:** border 1px, padding 12px, border-radius 8px
       - Header: Rating (★★★★ 4), reviewer name (12px bold), date (11px muted, right)
       - "Verified Purchase" badge (11px uppercase bold, green bg + dark text, border-radius 3px) — only if verified
       - Review title (13px bold, optional)
       - Review text (13px, line-height 1.5, truncate at 200px)
       - "Read more" link if review longer (store primary, 12px)
       - Images (if review has photos): 64×64 grid, 4px gap, tap to expand
       - Helpful section (flex, gap 8px):
         - "Helpful?" text (11px muted)
         - Thumb up button (22px circle, outlined, muted)
         - Count (11px muted)
       - Report button (11px muted text, icon, hover = red)
   - "Load more reviews" button (center, padding 12px, border 1.5px, store primary text) or pagination
   - Empty state (if no reviews): "No reviews yet · Be the first to review!" + CTA

**Desktop layout:**
- **Product layout** — 2-column grid (1fr 1fr, gap 0, max-width 1200px, centered)
- **Left column** — Gallery (position sticky, top 72px)
  - Main image (max-height 560px)
  - Thumbnail strip below (64×64 with 2px border, gap 8px)
- **Right column** — Product info (overflow-y auto)
  - All sections as mobile, no sticky bar at bottom
  - Sticky "Add to Cart" bar appears on scroll
  - Reviews section: full-width below product info

**Cart drawer** (overlay, fixed, right 0, width min(380px, 100vw))
- Slides from right (transform translateX(100%) → 0)
- Header: Title "Your Cart (N)" + close button
- Items list: thumbnail (72×72) + name + size + qty stepper + price
- Summary: subtotal + delivery + total (border-top on total)
- "Proceed to Checkout" CTA button (full-width, store primary)
- "Continue Shopping" link (center, store primary text)

**Out-of-stock state:** 
- Size pill: muted color, strikethrough text, opacity 0.5, cursor not-allowed
- If all sizes OOS: button shows "Notify Me" (V2 feature)

**Report review modal:**
- Bottom sheet on mobile, centered modal on desktop
- Title: "Report This Review"
- Reason radio buttons: "Spam", "Inappropriate", "Fake Review", "Other"
- Optional text area for details (13px, border 1.5px, padding 10px 12px)
- Cancel + Submit buttons

---

### 4.4 Storefront — Cart (`/cart`)

**Two surfaces:**
1. **CartDrawer** — slides from right (fixed position, 380px max width) when "Add to Cart" tapped (preferred UI)
2. **Cart page `/cart`** — full page fallback (mobile: single column, desktop: 2-col grid layout)

**Header** — Sticky, 60px (mobile) / 72px (desktop)
- Back arrow, title "My Cart (N items)", layout changes for desktop

**Empty state:**
- 72px circular icon placeholder, centered
- Heading + paragraph + "Continue Shopping" CTA
- Padding 80px 32px, min-height 60vh

**Cart items list:**
- 80×80 thumbnail (10px border-radius)
- Item body (flex: 1)
  - Name (15px bold, ellipsis overflow)
  - Meta (12px muted): "Size: M", "Qty: N" (flex gap 10px)
  - Actions (flex, space-between)
    - Price (17px bold) + MRP (12px muted, strikethrough)
    - Qty stepper (36px × 36px buttons, 32px value, flex gap 0, border-radius 8px)
- Remove button (32px circle, top-right, hover = red text)
- Removing animation: opacity 0, max-height 0 (0.3s transition)

**Discount section** — Padding 16px, border-bottom
- Label: "Have a coupon?"
- Input (flex: 1) + Apply button
- Applied state: input border green, text green
- Message (12px, error red / success green)

**Trust bar** — Padding 16px, margin-top 8px
- 3 rows with icons (16px, green stroke)
  - Lock: "Secure checkout — your data is encrypted"
  - Check: "Easy 7-day returns on all orders"
  - Truck: "Free delivery on this order"

**Order summary** (sidebar on desktop)
- Title: "Order Summary"
- Rows: Items (N) | ₹X, Delivery | ₹0, Discount | −₹X, Total (bold, border-top)
- Savings note (green bg, green text) if discount applied

**Sticky checkout bar** (fixed, bottom 0, mobile) / (static, desktop)
- "Proceed to Checkout" button (full-width, store primary, 16px padding)
- "Continue Shopping" link (center-aligned, store primary text)
- Discount code input (if Starter/Pro tier)
- Total
- "Proceed to Checkout" CTA (full-width, brand colour)
- "Continue Shopping" text link

---

### 4.5 Storefront — Checkout (`/checkout`)

> **Re-verified against live Paper artboards 2026-07-04** (`Step 1/2/3 — Mobile/Desktop`, `Order Confirmed — Mobile`). Mostly matches the written brief below, with a few corrections: the order summary is **always visible**, not a collapsible toggle confined to the Address step; the OTP step also offers **Google sign-in** as a fallback (previously undocumented); the Address form has **no Email field** in the live design; and there's a whole **Order Confirmed** screen after payment that had no spec at all — see new §4.5a.

**Three-step wizard form:**
1. Details (OTP login)
2. Address
3. Payment

**Header** — Sticky, 60px (mobile) / 72px (desktop)
- Back arrow, store name, "Secure Checkout" badge with lock icon (12px, green)

**Progress bar** — Full-width, padding 16px
- Horizontal step indicator (max-width 480px, centered, margin 0 auto)
- Layout: flex gap 0, max-width 480px
- Each step: 30px dot (numbered "2"/"3" when not yet reached) + label below
  - Dot: unfilled border with step number, done = filled store-primary with checkmark, active = store-primary outline with step number
  - Connecting line: 2px height between steps, background border color, done steps = store primary
  - Label: 11px uppercase, letter-spaced 0.04em, text-center, white-space nowrap
  - States: muted (unfilled) → store primary (active/done)

**Section cards** — Padding 20px 16px, margin-top 8px (first: 0)
- Mobile: single column, full-width — **order summary card, coupon field, and trust bar appear on every step** (Details/Address/Payment), not just Address
- Desktop: grid 2-col (main column + 360px fixed sidebar, gap 24px) — sidebar holds the order summary across all three steps

**OTP section** *(only the request-phone and verified states are designed — the OTP-entry step itself has no artboard, same gap noted in §4.1b)*:
- Phone input:
  - Label (13px bold)
  - Input (13px border 1.5px, padding 13px 14px, border-radius 8px), "+91" prefix chip on the left like the storefront Auth form
  - Helper text below: "We'll send a 4-digit OTP to verify your number"
  - Focus: border = store primary
- **"or continue with" divider + "Continue with Google" button** *(new — not previously specced)*, styled like the storefront Auth screen's Google button, directly below "Send OTP"
- Verified state (shown on Address and Payment steps once phone is confirmed):
  - Green bg (rgba 16 185 129 0.08), border 1px green (0.2 opacity)
  - Check icon (18px, green) + "Verified" text + phone number (right-aligned)
  - Border-radius 8px, padding 12px 14px

**Address section** — Form grid (grid 2-col, 12px gap)
- Full-width fields (grid-column 1/-1):
  - Name, Phone, Address line 1, Address line 2 (optional), Pincode, City, State — **no Email field** in the live design (written brief's "Email" was never built; drop it from scope)
- Each field:
  - Label (13px bold, letter-spaced 0.01em), required fields marked with `*`
  - Input or Select (13px, border 1.5px, padding 13px 14px, border-radius 8px)
  - Focus: border = store primary
  - Error state: border = red (#EF4444)
  - Select: custom dropdown arrow icon (SVG, right-aligned)

**Payment section — Delivery Address recap card** *(new — not previously specced)*: once past the Address step, Payment shows a compact non-editable card (name, full address, phone) with an "Edit" link (store-primary text, top-right) that returns to Step 2.

**Order summary** — **Always visible, not a collapsible toggle** (correcting the written brief)
- Mobile: static card, same position/order on every step (Details → Address → Payment)
- Desktop: static summary card in the fixed 360px sidebar, present on every step
- Items: 52×52 thumb + name (14px bold) + meta (12px muted, e.g. "Size: M · Qty: 1") + price (14px bold)
- Summary rows (14px muted, last column bold):
  - Subtotal | ₹X
  - Discount (MRP) | −₹X (green text)
  - Delivery | Free / ₹X
  - **Total** (17px bold, border-top, margin-top 4px, padding-top 10px)
- **Coupon field** ("Have a coupon?" label + input + "Apply" button) directly below the summary, on every step
- **Trust bar** (3 rows, icon + text, seen on every step): "Secure checkout — your data is encrypted", "Easy 7-day returns on all orders", "Free delivery on this order"

**Payment options** — Flex column, gap 10px
- Each payment card:
  - Border 1.5px, border-radius 10px, cursor pointer
  - Selected: border = store primary
  - Header: radio (20px, accent store primary) + icon badge (40×28px, flex-shrink 0, provider initials — "UPI"/"IM"/"RZ") + name (15px bold) + desc (12px muted)
  - Body (hidden, shown if selected): payment-specific content
- **UPI payment** (selected by default):
  - QR placeholder (120×120px, repeating grid pattern)
  - UPI ID label (12px uppercase, muted, letter-spaced 0.04em) + ID text (15px bold, word-break)
  - Steps text (13px muted, line-height 1.6, numbered 1-2-3)
  - UTR label (13px bold) + input field (15px, border 1.5px, padding 11px 13px) + helper text ("12-digit reference number from your payment app")
  - Its own **"Confirm Payment"** button inside the card (store primary, full-width) — distinct from the page-level "Place Order" CTA below
- **Instamojo / Razorpay:**
  - Note (13px muted, line-height 1.5)
  - Icon badge (dark background, coloured initials, 11px bold — "IM" navy, "RZ" dark navy)

**CTAs**
- Primary button (16px padding, store primary, 16px bold, full-width, border-radius 10px)
  - Active: scale 0.99, darker bg
- Secondary button (13px padding, border 1.5px, border-radius 10px, hover bg light)
- **Page-level "Place Order" button** sits below the payment-method list (separate from the UPI card's own "Confirm Payment" button)

**Sticky pay bar** (mobile only, fixed bottom 0, desktop: none) — present on the Details step too, not just Payment
- Total line: "Order Total" label (13px muted) + amount (20px bold)
- Primary button below (label changes per step: "Pay ₹X" / "Confirm Payment" / "Place Order")

---

### 4.5a Storefront — Order Confirmed (`/checkout/confirmed`)

**Purpose:** Post-payment confirmation. Reassure the customer and hand off to order tracking. *(New section — this screen existed in Paper with no corresponding spec until now.)*

**Layout (top to bottom), mobile only artboard so far:**
1. **Header** — Non-sticky, simple: store name (left), "Secure Checkout" badge with lock icon (right, green) — no back arrow (checkout is complete)
2. **Progress bar** — Same 3-step indicator as checkout, all three steps shown Done (filled store-primary, checkmarks)
3. **Success hero** — Centered, light green-tinted background band with scattered confetti-dot decorations
   - Large circular green checkmark badge (store-neutral green, not store-primary)
   - Heading: "Order Confirmed! 🎉" (20px bold)
   - Subtext: personalized, e.g. "Thanks [Name]! Your [product] is packed and on its way."
4. **Order ID card** — Bordered, centered text: "ORDER ID" label (11px uppercase muted) + order number (bold, e.g. "#ORD-2649"), divider, "ESTIMATED DELIVERY" label + date + delivery speed (green text, e.g. "Wed, 2 Jul · Standard delivery")
5. **Order Summary** — Same card as checkout (item thumbnails, name, size/qty, price), header shows item count on the right (e.g. "2 items")
6. **Totals** — Subtotal, Discount, Delivery, **Total Paid** (bold, border-top) — note "Total Paid" replaces checkout's "Total" label now that payment is done
7. **Delivering To card** — Bordered, label + name + full address (no edit action — order is placed)
8. **Payment card** — Bordered, label + payment method (icon badge + UPI ID) + amount paid + green "Verified" checkmark badge
9. **CTA stack** (full-width, stacked, gap ~10px):
   - "Track My Order" — store primary bg, clock icon
   - "Share on WhatsApp" — WhatsApp green (#25D366) bg, WhatsApp icon
   - "Continue Shopping" — outlined, no fill
10. **Reassurance note** — Light green bg card, two rows with icons: "You'll get a call from [Store Name] to confirm your order.", "30-day hassle-free return if you're not satisfied." *(Note: 30-day window shown here vs. the 7-day return mentioned in the checkout trust bar — inconsistent copy, worth flagging to whoever owns the copy.)*
11. **Footer** — "Powered by talam" badge, centered

**Not yet designed:** a desktop artboard for this screen — only `Order Confirmed — Mobile` exists in Paper today.

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

### 4.6a Storefront — Wishlist (`/wishlist`)

**Purpose:** Customer collection. Save favorites for later purchase.

**Header** — Sticky, 60px height
- Back arrow, "Saved Items" or "Wishlist" title, cart icon (with badge)

**Empty state:**
- 64px heart icon outline (muted stroke)
- Heading: "Your wishlist is empty"
- Subheading: "Save items you love to view later"
- "Continue Shopping" CTA button (store primary)

**Wishlist items:**
- Same ProductCard layout as Shop page
- 2-col mobile grid, 4-col desktop
- Each card: image, badges (Sale/New), heart icon (filled, store primary — toggles on click), name, price, rating
- Swipe left or tap menu (⋯) to:
  - "Add to Cart" button
  - "Remove from Wishlist" option
  - Remove animation: opacity 0, max-height 0 (0.3s transition)

**Actions bar (sticky bottom, mobile only):**
- Left: "Select All" checkbox
- Right: "Add to Cart" button (disabled if no items selected)
- Alternative: "Clear All" button (with confirmation)

**Desktop layout:**
- Same grid layout, 3-4 columns
- Cards show "Add to Cart" button on hover
- Hover menu (⋯) for additional actions
- **As of 2026-07-03:** the filter tab row (All Items / In Stock / Price ↑ / On Sale) and a "Share" button are also present on Desktop, next to the sort control — previously these only existed on Mobile. Header layout: title + item count/total on the left, `[Share] [Sort ▾] [Add All to Cart]` cluster on the right, filter tabs on their own row below

---

### 4.7 Tenant Admin — Onboarding Wizard

> **STALE as of v1.10 (2026-07-17):** the artboards below are the last Paper-verified state (2026-07-11, 5 steps). Shipped code has since grown this to **7 steps** — Store, Brand, Contact & Address, Your Story, Product, Payment, Go Live — with each step persisting immediately (see v1.10 changelog above and `docs/superpowers/specs/2026-07-17-onboarding-v2-design.md`). The step content, indicator styling, and footer nav below are unverified against updated Paper artboards for the 2 new steps; do not treat them as a pixel match until a fresh Paper re-verification pass.

**Triggered:** First login after signup. Can be skipped and resumed.

**Header** — Sticky, 56px height
- Logo: "talam." (brand accent on dot)
- Skip button (right, 13px muted text, skip to step 5)

**Step indicator** — Sticky, padding 20px 16px, border-bottom
- Horizontal dots: 32px circles, border 2px
  - Unfilled: border light gray, white bg
  - Active: border + bg color = brand (#4F3FF0), light bg (6% opacity)
  - Done: filled brand bg, white text
- Connecting lines: 2px height, max-width 32px, border color, brand color when done
- Labels below (10px uppercase, muted text, brand when active/done)

**Step panes** — Flex column, padding 24px 16px, fade-in animation (0.2s)
- Mobile: full-width, desktop (max-width 480px, centered)

**Step 1: Name your store**
- Heading (20px bold, -0.01em letter-spacing)
- Subheading (14px muted, line-height 1.5)
- Store name field (label 12px bold, input 15px, border 1.5px, padding 11px 13px)
- URL preview (background light, border 1.5px, padding 10px 13px, brand text for slug)
  - Format: "[slug].talam.app"
- Category dropdown (label 12px bold, select field with custom arrow icon)

**Step 2: Brand your store**
- Upload logo (drag-drop area, 1.5px dashed border, padding 32px 16px, centered)
  - Icon (32px), label (14px), sublabel (12px, light gray)
  - Hover: border = brand, bg light brand (3% opacity)
- Colour swatches (flex wrap, gap 8px, 40px circles)
  - Selected: 3px border dark, transform scale 1.1
- Hex input: flex row, gap 8px
  - Preview square (36×36, border 1px, border-radius 6px)
  - Hex input (flex 1, 14px monospace, uppercase, letter-spaced 0.04em)
- Live preview card (border 1px, border-radius 12px)
  - Header: dark bg, 8px dot (light gray)
  - Body: product card mockup (56×56 image, name, price, button)
  - Button: brand bg color (live-updated)

**Step 3: Add your first product**
- Product name field
- Product photo upload (drag-drop area, min 500×500px hint)
- Price field (₹ prefix, numeric)
- Stock quantity field (numeric)

**Step 4: Connect payments**
- Heading + subheading
- Payment radio cards (flex column, gap 10px)
  - Border 1.5px, border-radius 10px, padding 14px 16px
  - Selected: border brand, bg brand (4% opacity)
  - Header: radio (20px, accent brand) + icon (40×28px) + name (15px bold) + desc (12px muted)
  - Icons:
    - UPI: dark bg (#1A1040), amber text
    - Razorpay: dark blue bg (#072654), white text
    - Instamojo: dark blue bg (#004282), white text
  - Order: UPI, Razorpay, Instamojo
- "💡 Pro tip" callout (bg light, border 1px, padding 16px): "You can add multiple payment methods after setup. Start with one and expand later."

**Step 5: Go live**
- Completion checklist (4 items, each a done-row with a filled success-colour check icon): Store & website created, Brand & branding applied, First product added, Payment gateway connected
- "💡 Next steps" callout (bg light, border 1px, padding 16px): "Share your store link with customers, add more products, and watch the orders come in!"
- Store URL shown as muted monospace text
- Primary CTA reads "Go Live →" (not "Finish")

**Footer navigation** — Sticky, bottom 0, padding 16px, flex gap 10px
- Back button (14px, border 1.5px, padding 14px 20px)
- Skip button (14px muted, font-weight 500) — present on steps 1–4, absent on step 5
- Next button (flex 1, brand bg, white text, 15px bold, letter-spaced 0.02em) — reads "Go Live →" on step 5
  - Active: opacity 0.85

---

### 4.8 Tenant Admin — Dashboard (`/admin/dashboard`)

> **Re-verified against live Paper artboards 2026-07-04** (`Admin Dashboard / Mobile`, `Admin Dashboard / Desktop`). The dashboard is significantly more built out than this section previously described — a date-range filter, an alerts section, and a revenue chart all exist in Paper with no corresponding spec text until now. The desktop layout in particular was wrong: it is **not** a centered 960px column, it's a persistent sidebar app shell. Rewritten below to match.
>
> **Removed (2026-06-28):** the trial banner that previously appeared here was cut from spec. Do not design or build it.

**Header** — Sticky, 56px (mobile) / 72px (desktop)
- Logo: "talam." (brand accent on dot)
- Right: notification bell icon (unread-count red dot) + avatar (circle, brand-indigo fill, owner's first-initial — not a generic placeholder)

**Time filter row** *(new — not previously specced)* — Horizontal pill tabs directly under the header: **Today / Yesterday / This Week / This Month**. Active tab: filled brand-indigo background, white text. Inactive: outlined, muted text. Scopes every stat, the chart, and "vs yesterday" trend copy below it.

**Page layout**
- Mobile: single column, padding 16px, padding-bottom 80px (for bottom nav)
- Desktop: **persistent left sidebar app shell**, not a centered column
  - Sidebar: fixed, dark (`--color-bg-dark`), ~240px wide, full viewport height
    - Small brand mark (indigo square + dot) at top
    - Nav items (icon + label): Overview (active, brand-indigo text), Orders, Products, Customers, Settings
  - Content area: remaining width, `--color-bg` background, header + time filter + stat grid full-width, then a **2-column split** below: left column (Revenue Trend chart, Recent Orders) is flexible width, right column (Action Required, Top Products) is a fixed ~360px sidebar

**Section labels** — 11px uppercase bold, letter-spaced 0.08em, muted, margin-bottom 12px

**Action Required section** *(new — not previously specced)* — Shown only when there's something needing attention; stacked alert rows, each: left accent bar + icon, bold title, muted subtext, chevron. Three severities seen in the live design:
  - Amber (clock icon): "N orders awaiting confirmation" / "Pending for over 2 hours"
  - Amber (low-stock icon): "N items running low" / "Less than 5 units remaining"
  - Red (warning icon): "Payment failed — [provider]" / "Order #[id] · ₹[amount]"

**Stat grid** — Grid layout, 4 cards: **Revenue, Orders, Customers, Avg Order Value** (previously unspecified which four)
- Mobile: 2-column, gap 10px
- Desktop: 4-column, full-width row above the 2-column split
- Stat cards:
  - Border 1px, border-radius 8px, padding 14px
  - Value: 24px bold, -0.02em letter-spacing
  - Label: 12px muted
  - Trend: 11px bold, flex gap 3px
    - Up arrow (12px green stroke)
    - Up text: green, e.g. "+18% vs yesterday"
    - Down arrow/text: red
  - First card (Revenue): brand accent (border brand, bg brand 4% opacity, value brand color)

**Revenue Trend chart** *(new — not previously specced)* — Line/area chart, Mon–Sun x-axis, ₹ y-axis gridlines (0/10k/20k/30k). Segmented control above the chart to switch series: **Revenue / Orders / Customers** (Revenue selected by default, filled brand-indigo pill). Line stroke + area fill in brand indigo, with data-point dots on each day.

**Divider** (mobile only) — 8px height, light bg, margin 16px -16px (extends full-width). Not used on desktop, where the 2-column split provides separation instead.

**Recent Orders** — Section header ("Recent Orders" + "View all" link), then order cards, margin-bottom 8px each:
- Border 1px, border-radius 8px, padding 12px
- Order ID (12px bold uppercase, muted)
- Order time (11px muted, right-aligned, e.g. "3h ago", "Yesterday")
- Customer name (14px bold)
- Items list (13px muted, e.g. "2× Kurta Set, 1× Dupatta")
- Bottom row: amount (15px bold) | status badge
  - Status badges (11px bold uppercase, padding 3px 8px, border-radius 4px):
    - Pending: amber bg (#FEF3C7), dark text (#92400E)
    - Confirmed: green bg (#D1FAE5), dark text (#065F46)
    - Shipped: blue bg (#DBEAFE), dark text (#1E3A8A)
    - Delivered: light green bg (#F0FDF4), dark text (#14532D)

**Top Products** *(replaces the previously-specced flat "Product rows" list)* — Section header ("Top Products" + "View all" link), then a horizontal row of cards (3 on both mobile and desktop, no wrap):
- Each card: coloured icon tile (tag/label glyph, tinted background unique per card — lilac/amber/mint seen in the live design), product name (14px bold), sales count (12px muted, e.g. "24 sold"), stock note (12px, coloured — green "In stock", amber "Low (N left)")

**Bottom navigation** (mobile only) — Fixed, bottom 0, height 64px
- Background surface, border-top 1px
- Flex 5 items, center-aligned
- Each nav item: flex column center, gap 3px, 10px label, muted text
  - Icon (22px stroke)
  - Active: brand text, stroke-width 2.2
  - Inactive: muted text, stroke-width 1.8
- **Desktop has no bottom nav** — its 5 destinations (Dashboard/Overview, Orders, Products, Customers, Settings) live in the sidebar instead.

---

### 4.9 Tenant Admin — Products (`/admin/products`)

**Header** — Sticky, 56px height
- Logo + "Products" title

**Search bar** — Padding 12px 16px, border-bottom
- Search input wrap (flex, gap 8px, background light, border 1px, padding 9px 12px, border-radius 8px)
  - Icon (16px muted)
  - Input (14px, transparent background, placeholder muted)
- Filter button (border 1px, padding 9px 14px, 13px bold, gap 6px with icon)

**Results bar** — Padding 10px 16px, border-bottom, 12px muted text
- "N products" + filter summary

**Product list** — Background surface, no padding
- Each product row: flex gap 12px, padding 12px 16px, border-bottom 1px
  - Thumbnail (52×52, border-radius 8px, placeholder bg, border 1px)
  - Body (flex 1, min-width 0)
    - Name (14px bold, ellipsis)
    - Price (13px muted, with strikethrough MRP)
    - Meta badges (flex wrap, gap 6px)
      - Stock badge (10px uppercase bold, padding 2px 7px, border-radius 4px)
        - In Stock: green bg + dark text
        - Low: amber bg + dark text
        - Out of Stock: red bg + dark text
  - Actions (flex gap 4px, flex-shrink 0)
    - Status toggle (44×24, rounded 12px, brand bg, white dot, transitions)
      - Off: light gray bg, dot on left
    - Edit icon button (36×36, rounded 6px, muted, hover = light bg)

**FAB** — Fixed, bottom 80px (mobile), right 16px
- Padding 14px 20px, border-radius 999px
- Brand bg, white text, 14px bold, gap 8px
- Box shadow, active = scale 0.96
- Desktop: bottom 24px, right 24px

**Product editor modal** — Mobile: bottom sheet (border-radius 20px 20px 0 0), Desktop: centered modal (border-radius 16px, max-width 560px)
- Overlay: fixed inset, rgba 0 0 0 45%, display flex (mobile: align-items flex-end, desktop: align-items center justify-content center)
- Handle bar (36×4, border-radius 2px, border color, margin 12px auto)
- Header (padding 8px 20px 16px, border-bottom 1px, flex space-between)
  - Title (17px bold)
  - Close button (36×36 circle, muted)
- Body (padding 20px)
  - Image upload area (1.5px dashed border, padding 32px 16px, height 120px, flex column center)
    - Icon (28px muted stroke), label (13px), sublabel (11px light)
    - Hover: border brand, bg light brand
  - Form groups (margin-bottom 14px)
    - Label (12px bold uppercase)
    - Input field (14px, padding 10px 12px, border 1.5px, border-radius 8px)
    - Focus: border brand
  - Size checkboxes (flex wrap, gap 6px)
    - Checkbox UI (padding 6px 12px, border 1.5px, border-radius 6px, 13px bold)
    - Checked: border brand, bg brand (6% opacity), text brand
  - Stock inputs (flex wrap, gap 8px)
    - Size label (11px muted) + number input (56px wide, 7px padding, border 1px)
  - Toggle row (flex space-between, border-top 1px, padding 12px 0)
    - Label (14px bold)
    - Toggle switch (44×24)
- Footer (padding 16px 20px 24px, flex gap 10px, border-top 1px)
  - Cancel button (border 1.5px, padding 13px 20px, 15px bold)
  - Save button (flex 1, brand bg, white text, 15px bold, active = opacity 0.85)

---

### 4.10 Tenant Admin — Categories (`/admin/categories`)

**Purpose:** Let store owners define categories for products. Drag-to-reorder sets sort order (controls home category strips and filter tabs).

**Header** — Sticky, 56px height
- Logo + "Categories" title

**Empty state** — Centered, padding 64px 32px, min-height 60vh
- Icon (64×64 circle, border 1px, background light, muted stroke)
- Heading (16px bold)
- Paragraph (14px muted, line-height 1.5)
- "Add Category" CTA button (brand bg, white text, padding 13px)

**Category list** — Background surface
- Each category row: flex gap 12px, padding 16px, border-bottom 1px
  - Drag handle (icon, 18px muted stroke)
  - Category name (flex 1, 14px bold, editable on tap)
    - Edit mode: becomes input field (border 1.5px, padding 10px 12px)
    - Blur/Enter to save
  - Delete button (32px square, rounded, muted, hover = red text)
    - Icon (16px stroke)

**Add category bottom sheet** — Mobile: align-items flex-end, Desktop: align-items center justify-content center
- Handle bar (36×4, margin 12px auto)
- Header (padding 8px 20px 16px, border-bottom 1px)
  - Title (17px bold)
  - Close button (36×36 circle)
- Body (padding 20px)
  - Label (12px bold)
  - Input field (14px, padding 10px 12px, border 1.5px, border-radius 8px)
  - Focus: border brand
- Footer (padding 16px 20px 24px, flex gap 10px)
  - Cancel button (border 1.5px, padding 13px 20px)
  - Save button (flex 1, brand bg, white text, 15px bold)

**Delete confirmation dialog** — Modal overlay
- Message: "X products use this category. Reassign before deleting."
- Buttons: Cancel | Delete (red, danger text)

---

### 4.11 Tenant Admin — Orders (`/admin/orders`)

**Header** — Sticky, 56px height
- Logo + "Orders" title + search button (36px, muted)

**Filter tabs** — Sticky, background surface, border-bottom 1px, horizontal scroll
- Tab items: flex-shrink 0, padding 12px 16px, 14px bold, muted text
  - Border-bottom 2px transparent, transition
  - Active: border-bottom brand, text brand
  - Count badge (18px min-width, height 18px, padding 0 4px, border-radius 999px)
    - Active tab: brand bg, white text
    - Inactive tab: light gray bg, muted text

**Orders list** — Padding 12px 16px, flex column gap 10px

**Order card** — Border 1px, border-radius 10px, padding 14px, background surface
- Top row: order ID (12px bold, muted) | time (11px muted, right-aligned)
- Customer name (15px bold)
- Items (13px muted, line-height 1.4)
- Bottom row: amount (16px bold, font-variant-numeric tabular-nums) | actions (flex gap 8px)
  - Status button (flex gap 4px, padding 6px 10px, border 1.5px, border-radius 6px, 12px uppercase bold, cursor pointer)
    - Pending: amber bg (#FFFBEB), border #FDE68A, text #92400E
    - Confirmed: green bg (#ECFDF5), border #A7F3D0, text #065F46
    - Shipped: blue bg (#EFF6FF), border #BFDBFE, text #1E3A8A
    - Delivered: light green bg (#F0FDF4), border #BBF7D0, text #14532D
    - Cancelled: light red bg (#FEF2F2), border #FECACA, text #991B1B
    - Chevron icon (12px)
  - On click: opens bottom sheet with status options

**Status update sheet** — Mobile: bottom sheet, Desktop: centered modal (max-width 400px)
- Handle bar (36×4)
- Title (14px uppercase, muted)
- Options (flex column, gap 4px)
  - Each option: padding 15px 16px, border-radius 10px, 16px bold, flex space-between, cursor pointer
  - Hover: bg light
  - Active: brand text, bold
  - Danger (Cancel): red text
  - Icon (18px stroke)
- Cancel button (margin 8px 16px 24px, padding 15px, border 1.5px, 16px bold, muted text, width calc 100% - 32px)

**Tracking input** (shown for Shipped status)
- Margin-top 10px, padding-top 10px, border-top 1px
- Flex gap 8px
- Input (flex 1, padding 9px 12px, border 1.5px, border-radius 8px, 13px)
  - Focus: border brand
  - Background: light
- Save button (padding 9px 14px, brand bg, white text, 13px bold)

**Empty state** — Padding 64px 32px, text-align center
- Icon (64×64 circle, border 1px)
- Heading (16px bold)
- Paragraph (14px muted)

---

### 4.12 Tenant Admin — Settings (`/admin/settings`)

**Header** — Sticky, 56px height
- Back button + "Settings" title + "Save" button (right, 14px brand text)

**Settings sections** — Background surface, border-top + border-bottom 1px, margin-top 16px
- Desktop: max-width 640px, centered

**Section labels** — 11px uppercase bold, letter-spaced 0.08em, muted, padding 16px 16px 8px

**Store details section**
- Field rows (flex column, gap 4px, padding 0 16px 16px)
  - Label (12px bold, letter-spaced 0.02em)
  - Input field (15px, padding 10px 12px, border 1.5px, border-radius 8px)
  - Focus: border brand
- Dividers (1px height, background border, margin 0 16px)
- Fields: Store name, Tagline, About text (textarea, min-height 80px, resize vertical), Contact phone, Contact email

**Brand section**
- Logo upload row (flex gap 14px, padding 14px 16px)
  - Logo preview (56×56, border-radius 10px, border 1px, placeholder: initials 11px uppercase)
  - Upload info (flex 1)
    - Name (14px bold)
    - Sublabel (12px muted)
  - Change button (padding 8px 14px, border 1.5px, 13px bold, hover: border brand, text brand)
- Divider
- Primary colour section
  - Label (11px uppercase)
  - Colour swatches (flex wrap, gap 8px, 36px circles)
    - Selected: 3px border dark, scale 1.1
  - Preview button (padding 8px 14px, border 1.5px, 13px bold)

**Payment gateways section**
- Gateway rows (flex space-between, padding 14px 16px)
  - Gateway info (flex gap 12px)
    - Icon (44×30, border-radius 5px, dark bg, amber text, 10px bold)
    - Name (14px bold)
    - Status (12px green text, bold)
  - Change button (padding 8px 14px, border 1.5px, 13px bold)

**Notifications section**
- Toggle rows (flex space-between, padding 14px 16px)
  - Toggle info (flex 1, margin-right 16px)
    - Label (14px bold)
    - Sublabel (12px muted)
  - Toggle switch (48×26, border-radius 13px, brand bg)
    - Off: light gray bg
    - White dot (20×20, position absolute, top 3px right 3px, box-shadow, transition)
    - Off state: dot moves to left 3px

**Danger zone** — Margin-top 16px, padding 16px
- Delete store button (width 100%, padding 13px, border 1.5px light red, border-radius 8px, 14px bold, red text)
  - Background: light red (4% opacity)
  - Hover: light red (8% opacity)

---

### 4.13 Tenant Admin — Store About (`/admin/about`)

**Purpose:** Let store owners tell their story, add social links, and manage branch locations.

**Header** — Sticky, 56px height
- Logo + "Store About" title
- "Save" button (right, 14px brand text, disabled until changes)

**Page layout** — Padding 16px (mobile) / 24px 32px (desktop), max-width 640px centered

**Store story section** — Margin-bottom 24px
- Label: "Your Story" (11px uppercase bold, muted)
- Description: "Tell customers about your brand" (12px muted)
- Text editor area (border 1.5px, padding 14px, min-height 120px, resize vertical)
  - 14px, placeholder: "E.g. 'I started this in my home studio...'"
  - Supports markdown or rich text (bold, italic, links)
- Character counter (12px muted, right-aligned, e.g. "245/1000")

**Owner photo section** — Margin-bottom 24px
- Label: "Your Photo" (11px uppercase bold)
- Image upload area
  - If no image: dashed border (1.5px), 120px height, centered
    - Upload icon (28px muted stroke)
    - "Upload photo" label (13px bold)
    - "JPG or PNG, max 5MB" sublabel (11px muted)
  - If image uploaded: preview (120×120px, border-radius 8px)
    - Change button (padding 8px 14px, border 1.5px, 13px bold)
    - Remove button (12px red text, hover)

**Social links section** — Margin-bottom 24px
- Label: "Follow Us" (11px uppercase bold, muted)
- Input rows (flex column, gap 12px):
  - Each row: platform icon (18px) + input field (flex 1)
    - Placeholder: "https://instagram.com/yourhandle"
    - Platforms: Instagram, Facebook, YouTube, Google Business
  - Optional: add more links button

**Branch locations section** — Margin-bottom 24px
- Label: "Visit Our Locations" (11px uppercase bold)
- Instruction: "Add your physical store locations" (12px muted)
- Branch list (flex column, gap 8px)
  - Each branch row: flex gap 8px, padding 12px, border 1px, border-radius 8px
    - Drag handle icon (18px muted stroke, left)
    - Branch info (flex 1, min-width 0)
      - Name (14px bold, editable on click → becomes input)
      - Address (12px muted)
      - Phone link (12px, store primary)
    - Actions (flex gap 4px, flex-shrink 0)
      - Edit icon button (32px square, muted, hover = light bg)
      - Delete icon button (32px square, muted, hover = red text)
  - "Add Location" button (flex center, padding 14px, border 1px dashed, border-radius 8px, 13px bold, store primary text)

**Branch editor modal** — Bottom sheet on mobile, centered modal on desktop
- Handle bar (36×4)
- Header: "Add/Edit Location" (14px bold) + close button
- Form fields (padding 20px, flex column, gap 12px):
  - Name input (label + field)
  - Address textarea (label + field)
  - City input
  - Phone input
  - Maps URL input (label + field, e.g. "https://maps.google.com/...")
  - Preview: Map embed or "View on Maps" link button
- Footer: Cancel + Save buttons

**Save/Cancel buttons** — Sticky bottom (mobile) / static (desktop)
- Flex gap 10px, padding 16px
- Cancel button (border 1.5px, padding 13px 20px, 15px bold)
- Save button (flex 1, brand bg, white text, 15px bold, disabled if no changes)

---

### 4.14 Tenant Admin — Reviews (`/admin/reviews`)

**Purpose:** Moderate product reviews, handle reports, manage reputation.

**Header** — Sticky, 56px height
- Logo + "Reviews" title + unread count badge (right, brand bg)

**Filter tabs** — Sticky, background surface, border-bottom 1px, horizontal scroll
- Tab items: flex-shrink 0, padding 12px 16px, 14px bold, muted text
  - "All Reviews" (default)
  - "Reported" (with count badge)
  - "Pending" (awaiting moderation — V2 feature)
- Active: border-bottom 2px brand, text brand

**Page layout** — Padding 12px 16px, flex column gap 10px

**Review cards** — Flex column, gap 10px
- Each card: border 1px, border-radius 10px, padding 14px, background surface
- Header row: flex space-between
  - Left:
    - Rating (★★★★ 4) + reviewer name (12px bold) + date (11px muted)
    - "Verified Purchase" badge (11px, green bg)
  - Right: actions menu (⋯ icon, 32px circle button)
- Product info: "Reviewed on: [Product Name]" (12px muted, click → product detail)
- Review content:
  - Title (13px bold, optional)
  - Text (13px, line-height 1.5, max 300px before truncation)
  - "Read more" link if longer
  - Images: 64×64 grid (4px gap) if review has photos
- Action bar:
  - Helpful count: (11px muted) "X found helpful"
  - Moderation actions:
    - Delete icon (muted, hover = red)
    - Pin/feature icon (muted, toggle)
    - Flag/mark icon (muted, for reported reviews)

**Report card** (shown in "Reported" tab) — Same as above, plus:
- Red border indicator (left 4px)
- Report section (border-top 1px, margin-top 12px):
  - Report count: "Reported X times" (12px bold, red text)
  - Reason breakdown: "Spam (3), Inappropriate (2)" (11px muted)
  - Actions:
    - "Dismiss" button (outlined, 12px, muted border)
    - "Delete" button (outlined, 12px, red border + text)
    - "Contact reporter" option (V2)

**Action menu (⋯ dropdown):**
- "Hide from public" (toggle)
- "Delete review"
- "Mark as verified purchase"
- "Pin to top" (feature review)
- "Contact reviewer" (V2)

**Bulk actions** — Bottom bar when reviews selected
- Checkbox in review card header (36×36)
- Sticky bottom (mobile):
  - Left: "X selected" text
  - Right: Delete button (red), More actions (⋯)

**Empty state:**
- Icon (64×64 circle, border 1px)
- Heading: "No reviews yet"
- Paragraph: "Reviews will appear here once customers start rating your products"

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
[Dashboard] [Products] [Orders] [Customers] [Settings]
```
*(Confirmed live in the Paper file 2026-06-30 — 5 items, not 4. Desktop is meant to use a left sidebar nav per the [Admin Dashboard Revision](../2026-06-28-ADMIN-DASHBOARD-REVISION.md), but the live desktop artboard still reads as a top header with horizontal nav buttons — unresolved, see the Inventory doc.)*

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
    ├── talam4shop.com landing page
    ├── talam4shop.com/pricing (plan comparison)
    └── talam4shop.com/join (referral landing)
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

Designers: these are the **exact token names from the live Paper file** (44 tokens, content hash `42f27fdd`, verified 2026-06-30) — not placeholder names. There is no app codebase yet (no `app/` directory exists in this repo), so Paper is the only canonical source for these until a Tailwind/CSS export happens. Use these exact names in your annotations.

```css
/* Colour */
--color-fg               /* #18181B */
--color-muted            /* #8B7D7A */
--color-border           /* #E8E8E8 */
--color-border-light     /* #F0F0F0 */
--color-surface          /* #FFFFFF */
--color-bg                /* #F9F9F9 */
--color-bg-dark           /* #1A1A1A */
--color-store-primary    /* Themable per tenant — example #E8577E */
--color-amber             /* #F59E0B */
--color-danger            /* #EF4444 */
--color-success           /* #10B981 */
--color-success-bg        /* #F0FDF4 */
--color-success-border    /* #BBEDD4 */
--color-brand-primary    /* #4F3FF0 — Talam platform indigo */

/* Typography */
--font-heading            /* "Playfair Display", system-ui, serif */
--font-body                /* "DM Sans", system-ui, sans-serif */
--font-admin               /* system-ui, sans-serif */
--text-2xs … --text-2xl   /* 11px – 28px, 8-step scale, see §2 */
--font-weight-normal … --font-weight-bold   /* 400 / 500 / 600 / 700 */
--tracking-normal / --tracking-wide          /* 0em / 0.08em */
--leading-tight … --leading-loose            /* 16px – 34px, 5-step scale */

/* Spacing */
--spacing-1 … --spacing-10   /* 4px – 40px, 8-step scale, see §2 */

/* Radius */
--radius-sm … --radius-full  /* 4px – 999px, see §2 */
```

**Not yet tokenized — referenced in §4 as raw values, confirm before relying on a token name for these:**
```css
--header-height         /* 60px mobile, 72px desktop */
--bottom-nav-height     /* 64px mobile only */
--content-max-width     /* 1200px */
--sidebar-width         /* 280px (admin desktop, expanded state) */
```

---

## 11. What We Need Most (Priority Order)

1. **Storefront — Product Detail page** (highest conversion impact)
2. **Tenant Admin — Mobile dashboard** (most used by store owners)
3. **Onboarding wizard** (first experience — sets expectations)
4. **Checkout flow** (trust = conversion)
5. **talam4shop.com marketing site** — landing page, `/pricing` plan comparison, `/join` referral page (acquisition)
6. **Empty states** (polish, delight)
7. **Illustration set** (empty states, onboarding, success screens)

---

*Thank you for contributing to Talam. Every design contribution directly helps a small business owner in India get online faster.*
