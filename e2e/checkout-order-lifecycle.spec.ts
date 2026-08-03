import { test, expect, type Page } from '@playwright/test'

// The E2E_MOCK env authenticates every request as the seeded owner
// (E2E_OWNER_ID). The owner is both the store admin AND the customer here.
// Storefront pages are accessed via the /dev/store/<slug> proxy path which
// works on localhost regardless of NODE_ENV.

const STORE = '/dev/store/e2e-store'
const PRODUCT_SLUG = 'e2e-test-saree'

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function addProductToCart(page: Page) {
  await page.goto(`${STORE}/product/${PRODUCT_SLUG}`)
  await expect(page.getByText('E2E Test Saree')).toBeVisible()

  // Pick size M if a size picker is shown
  const sizeButton = page.getByRole('button', { name: 'M' })
  if (await sizeButton.isVisible().catch(() => false)) {
    await sizeButton.click()
  }

  await page.getByRole('button', { name: /add to (cart|bag)/i }).click()
  // Cart count badge or confirmation should appear
  await expect(page.getByText(/added|cart/i).first()).toBeVisible({ timeout: 5000 })
}

async function fillAddress(page: Page) {
  await page.getByLabel(/name/i).first().fill('Test Buyer')
  await page.getByLabel(/phone/i).first().fill('9000000001')
  await page.getByLabel(/address line 1/i).first().fill('42 E2E Street')
  await page.getByLabel(/pincode/i).first().fill('600001')
  await page.getByLabel(/city/i).first().fill('Chennai')
  // State dropdown
  await page.locator('select').selectOption('Tamil Nadu')
}

async function navigateToCheckout(page: Page) {
  await page.goto(`${STORE}/checkout`)
}

// ─── Store browsing ────────────────────────────────────────────────────────────

test.describe('Store browsing', () => {
  test('storefront home loads for the seeded tenant', async ({ page }) => {
    const res = await page.goto(STORE)
    expect(res?.status()).toBeLessThan(400)
    await expect(page.getByText('E2E Test Store').first()).toBeVisible()
  })

  test('product detail page renders the seeded product', async ({ page }) => {
    await page.goto(`${STORE}/product/${PRODUCT_SLUG}`)
    await expect(page.getByText('E2E Test Saree')).toBeVisible()
    await expect(page.getByText('1,999').first()).toBeVisible()
  })
})

// ─── Add to cart ───────────────────────────────────────────────────────────────

test.describe('Add to cart', () => {
  test('can add a product to the cart', async ({ page }) => {
    await addProductToCart(page)
  })
})

// ─── Checkout — UPI success ────────────────────────────────────────────────────

test.describe('Checkout — UPI payment (success)', () => {
  test('full checkout flow with UPI manual payment', async ({ page }) => {
    // 1. Add product
    await addProductToCart(page)

    // 2. Go to checkout — auth step is auto-skipped (E2E_MOCK = signed in)
    await navigateToCheckout(page)

    // Should land on step 2 (address) since user is already authenticated
    await expect(page.getByText(/delivery address/i)).toBeVisible({ timeout: 10000 })

    // 3. Fill address
    await fillAddress(page)
    await page.getByRole('button', { name: /continue to payment/i }).click()

    // 4. Step 3: Payment — UPI should be available
    await expect(page.getByText(/UPI/i).first()).toBeVisible({ timeout: 10000 })

    // Enter a valid 12-digit UTR
    await page.getByPlaceholder(/12-digit/i).fill('123456789012')
    await page.getByRole('button', { name: /confirm payment/i }).click()

    // 5. Should redirect to confirmation page
    await page.waitForURL(/\/checkout\/confirmed\//, { timeout: 15000 })
    await expect(page.getByText(/order/i).first()).toBeVisible()
  })
})

// ─── Checkout — failure cases ──────────────────────────────────────────────────

test.describe('Checkout — failure cases', () => {
  test('empty cart shows empty state on checkout page', async ({ page }) => {
    // Go to checkout without adding anything — cart is empty by default
    await navigateToCheckout(page)
    await expect(page.getByText(/cart is empty/i)).toBeVisible({ timeout: 10000 })
  })

  test('invalid UTR is rejected (less than 12 digits)', async ({ page }) => {
    await addProductToCart(page)
    await navigateToCheckout(page)
    await expect(page.getByText(/delivery address/i)).toBeVisible({ timeout: 10000 })

    await fillAddress(page)
    await page.getByRole('button', { name: /continue to payment/i }).click()
    await expect(page.getByText(/UPI/i).first()).toBeVisible({ timeout: 10000 })

    // Enter an invalid UTR (too short)
    await page.getByPlaceholder(/12-digit/i).fill('12345')

    // The "Confirm Payment" button should be disabled
    const confirmBtn = page.getByRole('button', { name: /confirm payment/i })
    await expect(confirmBtn).toBeDisabled()
  })
})

// ─── Admin order lifecycle ─────────────────────────────────────────────────────

test.describe('Admin order lifecycle', () => {
  test('admin sees the seeded pending order', async ({ page }) => {
    await page.goto('/admin/orders')
    await expect(page.getByText('Pending').first()).toBeVisible({ timeout: 10000 })
  })

  test('admin can confirm → ship → deliver an order', async ({ page }) => {
    // First, place a fresh order so we have a known pending order to manage
    await addProductToCart(page)
    await navigateToCheckout(page)
    await expect(page.getByText(/delivery address/i)).toBeVisible({ timeout: 10000 })
    await fillAddress(page)
    await page.getByRole('button', { name: /continue to payment/i }).click()
    await expect(page.getByText(/UPI/i).first()).toBeVisible({ timeout: 10000 })
    await page.getByPlaceholder(/12-digit/i).fill('111111111111')
    await page.getByRole('button', { name: /confirm payment/i }).click()
    await page.waitForURL(/\/checkout\/confirmed\//, { timeout: 15000 })

    // Now go to admin orders
    await page.goto('/admin/orders')
    await expect(page.getByText('Pending').first()).toBeVisible({ timeout: 10000 })

    // Click "Action" on the first pending order
    await page.getByRole('button', { name: 'Action' }).first().click()

    // The action sheet should show — click "Confirm"
    const confirmButton = page.getByRole('button', { name: /confirm/i }).first()
    await expect(confirmButton).toBeVisible({ timeout: 5000 })
    await confirmButton.click()

    // Wait for status to update
    await expect(page.getByText('Confirmed').first()).toBeVisible({ timeout: 10000 })

    // Ship the order
    await page.getByRole('button', { name: 'Action' }).first().click()
    const shipButton = page.getByRole('button', { name: /ship/i }).first()
    await expect(shipButton).toBeVisible({ timeout: 5000 })
    await shipButton.click()
    await expect(page.getByText('Shipped').first()).toBeVisible({ timeout: 10000 })

    // Deliver the order
    await page.getByRole('button', { name: 'Action' }).first().click()
    const deliverButton = page.getByRole('button', { name: /deliver/i }).first()
    await expect(deliverButton).toBeVisible({ timeout: 5000 })
    await deliverButton.click()
    await expect(page.getByText('Delivered').first()).toBeVisible({ timeout: 10000 })
  })
})
