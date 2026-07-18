import '@testing-library/jest-dom'
import { vi } from 'vitest'

// next/cache's unstable_cache requires a request-scoped incremental cache
// that only exists inside the Next.js runtime — outside it (unit tests),
// it throws. Tests exercise the wrapped function's logic, not caching, so
// make it a passthrough here.
vi.mock('next/cache', () => ({
  unstable_cache:
    <Args extends unknown[], R>(fn: (...args: Args) => Promise<R>) =>
    (...args: Args) =>
      fn(...args),
}))
