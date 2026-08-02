import { test, expect } from '@playwright/test'

test.describe('Smoke tests', () => {
  test('homepage loads without error', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBeLessThan(500)
  })

  test('unknown route returns 404, not 500', async ({ page }) => {
    const response = await page.goto('/this-does-not-exist')
    expect(response?.status()).not.toBe(500)
  })

  // E2E_MOCK always authenticates as the fixture owner seeded in e2e/seed.ts, so
  // /auth (only for logged-out visitors) redirects away, and admin loads directly.
  test('auth page redirects an already-authenticated user to admin', async ({ page }) => {
    await page.goto('/auth')
    await page.waitForURL(/\/admin/)
  })

  test('admin dashboard loads for the seeded owner', async ({ page }) => {
    const response = await page.goto('/admin/dashboard')
    expect(response?.status()).toBeLessThan(400)
    await expect(page.locator('body')).not.toBeEmpty()
  })
})
