# Admin Dashboard — Enhanced Design Spec

**Date:** 2026-06-27
**Status:** Approved, Ready for Implementation
**Scope:** Admin Dashboard (Phase 3, Page 3) — enhanced from Tier 1 baseline
**Builds on:** docs/2026-06-27-talam-tier1-tier2-design.md (Phase 1 & 2 complete)

---

## Overview

The admin dashboard serves two simultaneous mental modes for store owners:

- **Reporting mindset** — "How am I doing?" (check numbers, trends)
- **Operations mindset** — "What needs my attention?" (action orders, alerts)

The layout leads with metrics (numbers set context), then surfaces actions (now you know why to act).

---

## Mobile Layout (390px) — Scroll Order

```
Header (sticky, 60px)
Time Filter Row
Stats Grid (2×2)
─── divider ───
Chart + Metric Toggle
─── divider ───
Action Required Strip (conditional)
─── divider ───
Quick Actions Row
─── divider ───
Recent Orders
─── divider ───
Top Products
Bottom Nav (fixed, 64px)
```

---

## Desktop Layout (1440px, max-content 1200px, padding 32px)

```
Header (sticky, 72px)
Time Filter Row
Stats Grid (4 columns)

[Chart + Metric Toggle  |  Action Required Strip]
[     1fr (~65%)        |       360px (~35%)    ]
[     gap: 24px                                 ]

[Recent Orders          |  Top Products         ]
[     1fr (~60%)        |       360px (~40%)    ]
[     gap: 24px                                 ]
```

On desktop, Top Products renders as a **vertical list** (not horizontal scroll).

---

## Section Specs

### 1. Header

**Mobile (60px, sticky) / Desktop (72px, sticky)**
- Left: "talam." logo (brand accent on dot)
- Right: bell icon with unread count badge (red dot 8px) + avatar (32px circle)

Unchanged from Tier 1 baseline.

---

### 2. Time Filter Row

Horizontal pill tabs — not sticky.

**Tabs:** `Today` · `Yesterday` · `This Week` · `This Month`

- Active pill: `--brand-primary` bg, white text, 12px bold
- Inactive: border `--border`, `--muted` text, 12px
- Padding: 12px 16px container, gap 8px between pills
- Horizontal scroll if needed (no clipping)

**Behavior:** All stat cards and the chart react to the selected period. Trend comparisons use the equivalent prior period (Today → vs yesterday; This Week → vs last week; etc.).

---

### 3. Stats Grid

**Mobile:** 2×2 grid, gap 10px, padding 16px
**Desktop:** 4-column row

| Card | Value | Trend label |
|---|---|---|
| Revenue | 24px bold, `--brand-primary` | ↑/↓ % vs prior period |
| Orders | 24px bold, `--fg` | ↑/↓ % vs prior period |
| Customers | 24px bold, `--fg` | ↑/↓ N new |
| Avg Order Value | 24px bold, `--fg` | ↑/↓ ₹ vs prior period |

> "Avg Order Value" replaces the original "Growth" card — it's directly actionable and tells owners whether customers are buying more per visit.

**Card anatomy:**
- Value: 24px bold
- Label: 12px `--muted`
- Trend: 11px bold, green (↑) or red (↓)
- Revenue card: border `--brand-primary`, bg brand at 4% opacity
- Other cards: border `--border`, bg `--surface`
- Border radius: 10px, padding: 14px

---

### 4. Chart + Metric Toggle

**Metric toggle** (above chart, right-aligned row)
- 3 pill tabs: `Revenue` · `Orders` · `Customers`
- Style: 11px, compact padding 4px 10px
- Default selected: Revenue

**Chart**
- Revenue mode: Line chart, smooth curve, `--brand-primary` stroke 2px, area fill brand at 8% opacity
- Orders / Customers mode: Bar chart, bars `--brand-primary` at 70% opacity, selected bar 100%
- X-axis adapts to filter period:
  - Today / Yesterday → hourly labels (9am, 12pm, 3pm, 6pm, 9pm)
  - This Week → Mon · Tue · Wed · Thu · Fri · Sat · Sun
  - This Month → week labels or dates
- Y-axis: 3–4 gridlines, `--muted` color, no border box
- Tooltip on tap: floating pill — "Wed · ₹4,200"
- Height: 160px mobile, 200px desktop
- Empty state: dashed baseline + "No data yet for this period" (`--muted`)

**Container:** padding 16px, bg `--surface`

---

### 5. Action Required Strip (conditional)

Hidden entirely when there are no alerts.

**Section header**
- "ACTION REQUIRED" — 11px uppercase bold, `--danger` (#EF4444)
- Padding: 16px 16px 8px

**Alert cards** (flex column, gap 8px, padding 0 16px 16px)

Each card: left border 3px + bg tint + flex row, full card tappable → navigates to relevant screen.

| Alert type | Border / tint color | Icon | Example text |
|---|---|---|---|
| Pending order | `--warning` amber | Clock icon | "3 orders awaiting confirmation" |
| Low stock | `--warning` amber | Box icon | "2 items running low (< 5 left)" |
| Failed payment | `--danger` red | Alert triangle | "1 payment failed — Razorpay" |
| New review | `--info` blue | Star icon | "2 new reviews need response" |

**Card anatomy:**
- Left border: 3px solid (alert color)
- Bg: alert color at 6% opacity
- Border radius: 8px, padding: 12px 14px
- Row: Icon (18px) · Primary text (13px bold `--fg`) · Subtext (12px `--muted`) · Chevron right
- Entire card tappable

**All-clear state** (no alerts):
- Single row: green check icon + "You're all caught up" (13px `--muted`)
- Auto-collapses after 2s on first load

**Desktop:** Action Required strip sits in a 360px fixed-width column to the right of the chart.

---

### 6. Quick Actions Row

**Section header**
- "QUICK ACTIONS" — 11px uppercase bold, `--muted`
- Padding: 16px 16px 8px

**4 tiles** (horizontal scroll row, gap 10px, padding 0 16px 16px)

| Tile | Icon | Label | Destination |
|---|---|---|---|
| Add Product | Plus-square icon | "Add Product" | Add Product screen |
| View Orders | List icon | "View Orders" | Orders screen |
| View Store | External link icon | "View Store" | Storefront URL (opens browser) |
| Share Link | Share icon | "Share Link" | Native share sheet with store URL |

**Tile anatomy:**
- Size: 72px wide
- Border: `--border`, border-radius: 10px, bg: `--surface`
- Icon: 24px stroke, `--brand-primary`
- Label: 11px 500 weight `--fg`, centered below icon
- Padding: 14px 8px, gap 6px icon↔label
- Press state: bg `--brand-primary` at 6% opacity, border brand

---

### 7. Recent Orders

**Section header** (flex space-between, padding 16px 16px 8px)
- Left: "RECENT ORDERS" — 11px uppercase bold, `--muted`
- Right: "View all" — 12px `--brand-primary`

**Order cards** (flex column, gap 8px, padding 0 16px)

**Urgency flag:** Orders pending > 2 hours show timestamp in `--warning` amber instead of `--muted` grey.

Card anatomy:
- Order ID (12px bold `--muted`) + time (right-aligned, 12px — amber if > 2h pending)
- Customer name: 14px bold
- Items: "2x Kurta, 1x Saree" (13px `--muted`)
- Bottom row: Amount (15px bold) · Status badge · Chevron

**Status badges:**
- Pending → amber
- Confirmed → blue
- Shipped → blue
- Delivered → green
- Failed → red *(added from baseline)*

**"View all orders"** button (centered, border, `--brand-primary` text)

**Empty state:** Illustration + "No orders yet — share your store to get started" + Share Link button

**Desktop:** Full-width card list in the left column (1fr). No horizontal scroll needed.

---

### 8. Top Products

**Section header** (flex space-between, padding 16px 16px 8px)
- Left: "TOP PRODUCTS" — 11px uppercase bold, `--muted`
- Right: "View all" — 12px `--brand-primary`

**Mobile: Horizontal scroll row** (gap 10px, padding 0 16px 16px, no visible scrollbar)

Card: 120px wide, rounded 10px, border `--border`, bg `--surface`
- Image: 120×80px, rounded top 10px, object-fit cover, bg `--bg` placeholder
- Body (padding 8px):
  - Product name: 12px bold, 2-line clamp
  - Units sold: 11px `--muted` — e.g., "24 sold"
  - Stock: 11px — green "In stock" / amber "Low (3 left)" / red "Out of stock"

Shows 3–5 products.

**Desktop: Vertical list** in the right 360px column

Each row: 52×52px thumbnail (rounded 8px) + flex column (name 13px bold, units 12px `--muted`, stock badge 11px)
- Gap: 12px between rows
- Border-bottom `--border` between rows

**Empty state:** "Add products to see top sellers" (single muted card)

---

## Design Constraints (inherited)

- Mobile-first: 390px artboard, then expand to 1440px
- Touch targets: min 44×44px on all interactive elements
- Spacing: 4px base unit
- Animations: fade 200ms, slide 250–300ms ease-out
- Accessibility: color + text/icon for all states (never color alone)
- Respect `prefers-reduced-motion`

---

## What Changed From Baseline

| Baseline | Enhanced |
|---|---|
| Static stat numbers | Stats react to time filter (Today / Yesterday / This Week / This Month) |
| No chart | Selectable metric chart (Revenue / Orders / Customers) |
| No alerts | Action Required strip (pending orders, low stock, failed payments, new reviews) |
| No quick actions | Quick Actions row (Add Product / View Orders / View Store / Share Link) |
| No top products on mobile | Top Products horizontal scroll on mobile, vertical list on desktop |
| "Growth" stat card (vague) | "Avg Order Value" (actionable) |
| No urgency on orders | Pending > 2h orders flagged in amber |
| No failed order status | Failed badge added |
| Desktop: top products separate | Desktop: chart + actions side-by-side; orders + products side-by-side |
