import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { E2E_OWNER_ID } from '../lib/supabase/e2e-mock'

// Minimal fixture for the E2E suite: one fully onboarded, live tenant owned by the
// fake E2E_MOCK auth user, with just enough data for the admin pages under test to
// render real content (not empty states) — not a full storefront catalog.
async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { ownerId: E2E_OWNER_ID },
    create: {
      ownerId: E2E_OWNER_ID,
      slug: 'e2e-store',
      name: 'E2E Test Store',
      isOnboarded: true,
      isLive: true,
      onboardingStep: 6,
      brandColor: '#4F3FF0',
      storeType: 'Clothing',
      contactPhone: '9876543210',
      contactEmail: 'owner@e2e.test',
      tagline: 'Testing, testing',
      paymentProvider: 'upi_manual',
      paymentConfig: { upi: { enabled: true, upiId: 'test@upi' } },
    },
    update: {
      isOnboarded: true,
      isLive: true,
      paymentConfig: { upi: { enabled: true, upiId: 'test@upi' } },
    },
  })

  await prisma.storeBranch.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000b1' },
    create: {
      id: '00000000-0000-0000-0000-0000000000b1',
      tenantId: tenant.id,
      name: 'Main Store',
      address: '123 Test Street',
      city: 'Mumbai',
    },
    update: {},
  })

  const category = await prisma.productCategory.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'sarees' } },
    create: { tenantId: tenant.id, name: 'Sarees', slug: 'sarees', department: 'women' },
    update: {},
  })

  await prisma.product.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'e2e-test-saree' } },
    create: {
      tenantId: tenant.id,
      name: 'E2E Test Saree',
      slug: 'e2e-test-saree',
      price: 1999,
      categoryId: category.id,
      sizes: ['M'],
      images: [],
      stockBySize: { M: 5 },
    },
    update: {},
  })

  await prisma.productTag.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'diwali' } },
    create: { tenantId: tenant.id, name: 'Diwali', slug: 'diwali', emoji: '🪔', isDefault: true, themeKey: 'diwali-gold' },
    update: {},
  })

  const customer = await prisma.customer.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000c1' },
    create: { id: '00000000-0000-0000-0000-0000000000c1', tenantId: tenant.id, name: 'Test Customer' },
    update: {},
  })

  await prisma.order.upsert({
    where: { id: '00000000-0000-0000-0000-0000000000d1' },
    create: {
      id: '00000000-0000-0000-0000-0000000000d1',
      tenantId: tenant.id,
      customerId: customer.id,
      total: 1999,
      status: 'pending',
      paymentStatus: 'pending',
      shippingAddress: { address: '123 Test Street', city: 'Mumbai', phone: '9876543210' },
    },
    update: {},
  })

  console.log(`Seeded E2E tenant ${tenant.slug} (${tenant.id})`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
