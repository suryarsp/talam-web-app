import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf-8')

describe('store-primary derived theme tokens', () => {
  it('defines an ink token mixed 72% toward black', () => {
    expect(css).toMatch(
      /--color-store-primary-ink:\s*color-mix\(in srgb,\s*var\(--color-store-primary\)\s*72%,\s*black\)/
    )
  })

  it('defines a soft token mixed 10% toward white', () => {
    expect(css).toMatch(
      /--color-store-primary-soft:\s*color-mix\(in srgb,\s*var\(--color-store-primary\)\s*10%,\s*white\)/
    )
  })

  it('defines a tint token mixed 4% toward white', () => {
    expect(css).toMatch(
      /--color-store-primary-tint:\s*color-mix\(in srgb,\s*var\(--color-store-primary\)\s*4%,\s*white\)/
    )
  })
})
