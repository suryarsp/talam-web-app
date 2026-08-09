import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf-8')

describe('store-primary runtime override', () => {
  it('keeps --color-store-primary dynamic via a --store-primary indirection, not a bare literal', () => {
    // Regression guard: @theme inline bakes a bare literal straight into compiled
    // utility CSS, silently breaking the per-tenant override in app/store/layout.tsx.
    expect(css).toMatch(/--color-store-primary:\s*var\(--store-primary\)/)
  })

  it('declares a --store-primary default in :root for layout.tsx to override', () => {
    expect(css).toMatch(/--store-primary:\s*#[0-9a-fA-F]{6}/)
  })
})

describe('store-primary derived theme tokens', () => {
  // Regression guard: these read --store-primary directly, not --color-store-primary
  // (itself a var() indirection) — nesting color-mix() two levels deep through another
  // var()-wrapped custom property left it stuck on the CSS default in manual testing.
  it('defines an ink token mixed 72% toward black', () => {
    expect(css).toMatch(
      /--color-store-primary-ink:\s*color-mix\(in srgb,\s*var\(--store-primary\)\s*72%,\s*black\)/
    )
  })

  it('defines a soft token mixed 10% toward white', () => {
    expect(css).toMatch(
      /--color-store-primary-soft:\s*color-mix\(in srgb,\s*var\(--store-primary\)\s*10%,\s*white\)/
    )
  })

  it('defines a tint token mixed 4% toward white', () => {
    expect(css).toMatch(
      /--color-store-primary-tint:\s*color-mix\(in srgb,\s*var\(--store-primary\)\s*4%,\s*white\)/
    )
  })
})
