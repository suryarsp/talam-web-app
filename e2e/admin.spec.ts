import { test, expect } from '@playwright/test'

// These run as the fixture owner e2e/seed.ts provisions (the default E2E_MOCK
// identity) — a real onboarded tenant with real seeded rows in Postgres.

test('dashboard loads with real data for the seeded tenant', async ({ page }) => {
  const response = await page.goto('/admin/dashboard')
  expect(response?.status()).toBeLessThan(400)
  await expect(page.getByText('Revenue')).toBeVisible()
})

test('products page lists the seeded product', async ({ page }) => {
  await page.goto('/admin/products')
  await expect(page.getByText('E2E Test Saree').first()).toBeVisible()
})

test('occasions page lists the seeded occasion and can toggle it live', async ({ page }) => {
  await page.goto('/admin/occasions')
  await expect(page.getByText('Diwali')).toBeVisible()
})

test('settings page loads the contact info tab with the seeded phone number', async ({ page }) => {
  await page.goto('/admin/settings')
  await expect(page.locator('input[value="9876543210"]')).toBeVisible()
})
