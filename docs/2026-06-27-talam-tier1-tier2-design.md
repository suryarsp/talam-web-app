# Talam Tier 1 + Tier 2 Wireframe Design Spec

**Date:** 2026-06-27  
**Status:** Ready for Implementation  
**Scope:** Admin Dashboard (Tier 1), Onboarding Wizard (Tier 2), Checkout Flow (Tier 2)  
**Tool:** Paper Design MCP  
**Reference:** docs/2026-06-23-talam-oss-design.md (sections 4.7–4.14)

---

## Overview

This spec defines the wireframe design for three high-priority screens across the Talam platform. We will design mobile-first (390px), then add desktop layouts (1440px), extracting reusable components as needed.

**Why these three screens:**
- **Admin Dashboard (Tier 1):** Most-used screen by store owners; highest impact on retention
- **Onboarding Wizard (Tier 2):** First experience; sets expectations for the platform
- **Checkout Flow (Tier 2):** Drives conversion; trust is critical

---

## Design System (Page 1)

A reference page documenting all design tokens used across wireframes.

### Color Tokens
```
Platform:
  --brand-primary:       #4F3FF0 (Deep indigo)
  --brand-secondary:     #F59E0B (Warm amber)

Semantic:
  --success:             #10B981 (Green)
  --danger:              #EF4444 (Red)
  --warning:             #F59E0B (Amber)
  --info:                #3B82F6 (Blue)

Neutral:
  --bg:                  #F9FAFB (Light background)
  --surface:             #fff (White surface)
  --fg:                  #111827 (Dark text)
  --muted:               #6B7280 (Secondary text)
  --border:              #E5E7EB (Border color)
  --ph:                  #D1D5DB (Placeholder)

Store-customizable:
  --store-primary:       #C2185B (Example: rose, set per tenant)
  --store-primary-hover: #9A1248
```

### Typography Tokens
**Families:**
- Admin/Platform: System Sans-Serif
- Storefront headings: Playfair Display
- Storefront body: DM Sans

**Scale (px):**
- 12px (labels, captions, badges — font-weight 600–700)
- 13px (button text, filter labels — 500–600)
- 14px (body text, card headings — 400–500)
- 15px (input text, section headings — 500–600)
- 16px (default body, section headings — 400–600)
- 18px (page titles mobile — 600)
- 20px (product names, large headings — 600–700)
- 24px (modal headings — 600–700)
- 26px+ (hero titles, clamp() on mobile — 700)

**Line heights:**
- 1.3 (tight: headings, product names)
- 1.4 (normal: labels, captions)
- 1.5 (readable: body text, descriptions)
- 1.6 (loose: multi-line input, long-form text)

### Spacing Scale (4px base)
```
4px, 6px, 8px, 10px, 12px, 14px, 16px, 20px, 24px, 32px, 40px
```

### Border Radius
```
4px   (minimal, small elements)
6px   (compact form controls)
8px   (standard cards, buttons, inputs)
10px  (order/product cards)
12px  (modals, larger containers)
16px  (product cards desktop, large modals)
20px  (filter sheets, onboarding modals)
999px (pills, avatars)
```

### Layout Constants
- **Mobile viewport:** 390px (target: iPhone 14)
- **Desktop viewport:** 1440px
- **Max content width:** 480px (mobile), 1200px (desktop)
- **Header height:** 60px (mobile), 72px (desktop)
- **Bottom nav height:** 64px (mobile only)
- **Admin sidebar width:** 280px (desktop only)

---

## Page 2: Admin Dashboard

**Purpose:** Store owner dashboard for at-a-glance metrics, recent orders, top products.

**Ref:** OSS spec section 4.8

### Mobile Layout (390px)

**Sections (top to bottom):**

1. **Header** (60px, sticky)
   - Logo: "talam." (brand accent on dot)
   - Right: bell icon (notifications), avatar (32px circle)

2. **Trial Banner** (if applicable, sticky below header)
   - Bg: --brand-primary
   - Text: "12 days left on your free trial" (13px bold white)
   - Button: "Upgrade" (12px white, 20% opacity bg)

3. **Stat Grid** (2-column, gap 10px, padding 16px)
   - **Revenue card:** border brand, bg brand 4% opacity
     - Value: 24px bold, --brand-primary
     - Label: 12px muted
     - Trend: 11px bold, green (↑ +18% vs yesterday)
   - **Orders card:** border standard, bg default
     - Value: 24px bold
     - Trend: 11px, red (↓ -5% vs yesterday)
   - **Customers card:** similar structure
   - **Growth card:** similar structure

4. **Divider** (8px light bg, extends full width)

5. **Recent Orders Section**
   - Label: "11px uppercase bold, muted"
   - Order cards (flex column, gap 8px, padding 16px):
     - Order ID: 12px bold muted (right-aligned time)
     - Customer name: 14px bold
     - Items: "2x Kurta, 1x Saree" (13px muted)
     - Bottom: Amount (15px bold) | Status button + chevron
     - Status badges: Pending (amber), Confirmed (green), Shipped (blue), Delivered (green)
   - "View all orders" button (center, border, brand text)

6. **Bottom Navigation** (fixed, 64px height, 4 items)
   - Dashboard, Products, Orders, Settings
   - Icons 22px stroke, active = brand color
   - Labels 10px

### Desktop Layout (1440px)

**Sections (side-by-side):**

1. **Header** (72px, sticky) — same as mobile
2. **Main content area** (max-width 960px, centered, padding 32px)
   - Stat grid: 4-column instead of 2-column
   - Recent Orders: full-width below stats
   - Top Products section (cards with images, sales count)
3. **No bottom nav** (desktop has top nav)

### States & Interactions
- Stat cards: clickable → filter drill-down (V2)
- Order status button: opens bottom sheet to change status
- Trend indicators: color-coded (green up, red down)

---

## Page 3: Onboarding Wizard

**Purpose:** 5-step setup flow for new store owners (name, brand, product, payment, launch).

**Ref:** OSS spec section 4.7

### Mobile Layout (390px)

**Shared Header** (56px, sticky)
- Logo: "talam." (brand accent on dot)
- Skip button (right, 13px muted)

**Shared Step Indicator** (sticky below header, padding 20px 16px)
- Horizontal dots: 32px circles, border 2px
  - Unfilled: border light, white bg
  - Active: border + bg --brand-primary, light bg (6% opacity)
  - Done: filled --brand-primary, white checkmark
- Connecting lines: 2px, border color (brand when done)
- Labels below: 10px uppercase, muted (brand when active/done)

**Step Panes** (fade-in animation 0.2s)

1. **Step 1: Name your store**
   - Heading: 20px bold
   - Subheading: 14px muted, line-height 1.5
   - Store name input: label (12px bold), input (15px, border 1.5px, padding 11px 13px)
   - URL preview: light bg, border 1.5px, "mystore.talam.app" (brand text)
   - Category dropdown: custom arrow icon

2. **Step 2: Brand your store**
   - Logo upload area: dashed border, 32px icon, label (14px), sublabel (12px)
   - Color swatches: flex wrap, gap 8px, 40px circles
     - Selected: 3px dark border, scale 1.1
   - Hex input: flex row, gap 8px
     - Preview square (36×36), hex input (flex 1, monospace, uppercase)
   - Live preview card: header (dark bg), product mockup with live button color

3. **Step 3: Add your first product**
   - Product name input
   - Price input
   - Category dropdown
   - Image upload area (drag-drop)
   - Size checkboxes: flex wrap, border UI, checked = brand bg (6% opacity)
   - "I'll add categories later" link

4. **Step 4: Connect payments**
   - Heading + subheading
   - Payment radio cards: border 1.5px, padding 14px 16px, rounded 10px
     - Selected: border brand, bg brand (4% opacity)
     - Header: radio + icon + name + description
     - Body (hidden, shown if selected): payment-specific fields
     - UPI: dark bg, amber text
     - Instamojo: dark blue bg, white text
     - Razorpay: dark blue bg, white text

5. **Step 5: Go live**
   - Confetti area (relative, 80px, overflow hidden)
   - Store link box: light bg, border 1.5px, rounded 8px
     - URL (14px bold, brand, monospace)
     - Copy button (border, 12px)
   - WhatsApp share button (25D366 bg, 15px bold, gap 8px with icon)
   - "View your store" button (outlined, border 1.5px, 15px bold)

**Shared Footer Navigation** (sticky bottom, padding 16px, flex gap 10px)
- Back button: 14px, border 1.5px, padding 14px 20px
- Next button: flex 1, brand bg, white text, 15px bold
- Skip button: 14px muted, 500 weight

### Desktop Layout (1440px)

**Same structure, centered:**
- Max-width 480px
- Step indicator: horizontal layout
- All form sections stacked, centered
- Modal-like appearance (optional light overlay behind)

---

## Page 4: Checkout Flow

**Purpose:** 3-step wizard for order completion (OTP → Address → Payment).

**Ref:** OSS spec section 4.5

### Mobile Layout (390px)

**Header** (60px, sticky)
- Back arrow, store name (with dot accent, store primary), "Secure Checkout" badge (lock icon, 12px green)

**Progress Bar** (full-width, padding 16px, centered)
- Step indicator: same as Onboarding (unfilled → filled → checkmark)
- Labels: "Details", "Address", "Payment"

**Section Cards** (padding 20px 16px, margin-top 8px, first: margin 0)

**Step 1: OTP Verification**

1. **Phone request state**
   - Label: "Phone Number" (13px bold)
   - Input: 13px, border 1.5px, padding 13px 14px, rounded 8px
   - Focus: border --store-primary

2. **OTP entry state**
   - 4 boxes: 48×52px each, gap 10px
   - Font: 22px bold, text-center
   - Border: 1.5px, focus = --store-primary
   - Input type: "number"

3. **Verified state**
   - Green bg (rgba 16 185 129 0.08), border 1px green (0.2 opacity)
   - Check icon (18px green) + "Verified" text + phone number (right)

**Step 2: Address Form** (grid 2-col, 12px gap)

- Full-width fields: Name, Email, Phone, Address line 1, Pincode, City, State
- Each field:
  - Label: 13px bold, letter-spaced 0.01em
  - Input/Select: 13px, border 1.5px, padding 13px 14px, rounded 8px
  - Focus: border --store-primary
  - Error: border red (#EF4444)
  - Select: custom dropdown arrow (SVG, right-aligned)

**Step 3: Payment Options** (flex column, gap 10px)

- Each payment card:
  - Border 1.5px, rounded 10px, cursor pointer
  - Selected: border --store-primary
  - Header: radio (20px) + icon (40×28px) + name (15px bold) + desc (12px muted)
  - Body (hidden, shown if selected):
    - **UPI:** QR placeholder (120×120px), UPI ID label, UTR input
    - **Instamojo/Razorpay:** Note text, logo badges

**Order Summary Toggle** (expandable)
- Mobile: flex space-between, title + total + chevron
- On open: items list + summary rows (Items, Delivery, Discount, Total)
- Max-height animation (0 → 400px, 0.3s transition)

### Desktop Layout (1440px)

**Grid layout:** 2-col (1fr 360px, gap 24px, max-width 1000px, centered)

- **Left:** Form sections (OTP, Address, Payment) stacked
- **Right:** Order summary (sticky, 360px fixed, top 72px)
  - Items list (52×52 thumbnails + name + meta + price)
  - Summary rows (14px muted, last column bold)
  - Total (17px bold, border-top, margin-top 4px)

**Sticky bottom bar** (mobile only, fixed bottom 0)
- Total line: "Total" (13px muted) + amount (20px bold)
- Primary button below

---

## Component Extraction Strategy

**During Design:**
As we wireframe these three screens, we'll identify and extract reusable components:

**From Admin Dashboard:**
- StatCard, OrderCard, Header, BottomNav, TabBar, Badge, StatusBadge, Card

**From Onboarding:**
- StepIndicator, Input, Select, Button, Radio, Checkbox, Modal (bottom sheet), ColorSwatch, FileUpload

**From Checkout:**
- StepIndicator (reuse), Input, Select, RadioCard (payment), ToggleRow, OrderSummaryPanel, Button variants

**Library will emerge naturally** as we build. No predefined component list — extract what we use.

---

## Design Constraints & Principles

1. **Mobile-first:** Every screen designed 390px first, then expanded to desktop
2. **Touch targets:** All interactive elements min 44×44px (mobile)
3. **System fonts:** Admin uses system sans-serif (no custom fonts)
4. **Consistent spacing:** Use 4px base unit
5. **Accessibility:** Color + text for all states (never color alone)
6. **Animations:** Fade 200ms, slide 250–300ms ease-out
7. **Reduce motion:** Respect `prefers-reduced-motion` — fall back to instant or simple fade

---

## Success Criteria

✅ Design System page created with all tokens  
✅ Admin Dashboard: mobile + desktop, all sections visible  
✅ Onboarding Wizard: all 5 steps, mobile + desktop  
✅ Checkout Flow: all 3 steps, mobile + desktop  
✅ Components extracted and organized as we build  
✅ Frame naming consistent: `[Section] / [Page] / [State]`  
✅ All text uses tokens from design system  
✅ Responsive layouts verified (390px, 1440px)

---

## Next Steps

1. Create Paper design file structure (5 pages)
2. Build Design System page (Page 1)
3. Design Admin Dashboard (Page 2)
4. Design Onboarding Wizard (Page 3)
5. Design Checkout Flow (Page 4)
6. Extract and organize component library
