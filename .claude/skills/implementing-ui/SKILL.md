---
name: implementing-ui
description: Build or modify any UI component/page in the Talam web app — shadcn primitives only, existing theme tokens, native web standards, RHF-based forms, reusable/SOLID React structure, and a co-located test. Use whenever building a new screen/component, editing an existing one, or adding a form. Trigger phrases: "build this screen", "add a component", "create a form", "implement this UI".
---

# Implementing UI

Rules for any UI work in this repo, so components come out consistent without re-explaining the conventions each time.

## 1. Components — shadcn only

Check `components/ui/` first (`button`, `input`, `label`, `card`, `tabs`, `form`, `select`, `textarea`, `dialog`, `badge`, `separator`, `sonner`). If the primitive doesn't exist yet, add it with the shadcn CLI:

```bash
npx shadcn add <name>
```

`components.json` already sets `style: base-nova`, `baseColor: neutral`, `iconLibrary: lucide` — don't override per-component. Never drop a raw `<input>`, `<select>`, `<button>`, etc. into feature code, and never pull in a different UI/component library.

## 2. Theme — use existing tokens

Style with the CSS variables already defined in `app/globals.css` (color, radius, spacing, type scale) — no hardcoded hex/px values, no new tokens invented on the fly. Match existing card/panel padding, radius, and border conventions; flag spacing/font inconsistency rather than introducing a new value.

## 3. Web standards

Prefer native elements/attributes over ARIA-only or JS-only reimplementations: `<label htmlFor>`, `type="email"`/`type="tel"`, semantic landmarks, the shadcn `Dialog` (built on native-friendly Radix primitives) instead of a hand-rolled modal. Don't strip the accessibility (keyboard nav, focus trap, aria wiring) that Radix/shadcn primitives already give you for free.

## 4. React practices

- **SRP** — one component, one responsibility. Extract a subcomponent or hook before a file grows multiple concerns.
- **Reusability** — shared UI goes in `components/`, shared logic in `hooks/` or `lib/`. Don't duplicate a pattern that already exists.
- **OCP** — extend via composition/props, don't edit a shared primitive's internals for one call site.
- Keep Next.js App Router server/client boundaries explicit (`"use client"` only where actually needed).

## 5. Forms — React Hook Form

Every form uses `useForm` + `zodResolver` (`@hookform/resolvers/zod`) with the shadcn `Form`/`FormField` wrapper (`components/ui/form.tsx`) — not manual `useState` per field. `components/auth/otp-form.tsx` is the existing reference pattern.

## 6. Tests — vitest

Every new/changed interactive component gets a co-located `*.test.tsx` using `vitest` + `@testing-library/react` + `@testing-library/user-event`. `components/auth/otp-form.test.tsx` is the pattern: mock external deps with `vi.mock`, assert on rendered behavior via `screen`/`userEvent`/`waitFor`, not internals. Run before considering the task done:

```bash
npm run test:run
```

Trivial presentational components (no logic, no branches) don't need a test.
