import { test, expect } from '@playwright/test'
import { E2E_USER_COOKIE } from '../lib/supabase/e2e-mock'

// Impersonates a fresh owner id that e2e/seed.ts never creates a tenant for, so
// /admin/onboarding sees no existing tenant row — a real first-time signup, driven
// through the real server actions against the real (ephemeral) Postgres from CI.
const FRESH_OWNER_ID = 'fresh-owner-no-tenant'

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: E2E_USER_COOKIE, value: FRESH_OWNER_ID, url: 'http://localhost:3000' },
  ])
})

test('a brand-new owner sees the onboarding wizard, not the dashboard', async ({ page }) => {
  await page.goto('/admin/onboarding')
  await expect(page.getByRole('heading', { name: /Name your store/ })).toBeVisible()
})

test('submitting the store step creates a real tenant row and advances', async ({ page }) => {
  await page.goto('/admin/onboarding')

  await page.getByLabel('Store name').fill('E2E Fresh Store')
  await page.getByRole('button', { name: 'Next →' }).first().click()

  // Real round trip: browser -> saveStoreStep server action -> Prisma -> Postgres -> re-render.
  await expect(page.getByRole('heading', { name: 'Brand your store' })).toBeVisible({ timeout: 10_000 })
})
