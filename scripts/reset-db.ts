import 'dotenv/config'
import { prisma } from '../lib/prisma'

// Wipes every row in every app table so testing restarts from a blank slate.
// User rows are safe to drop: app/auth/callback/route.ts re-upserts them on
// next login. Never touches the DB schema or _prisma_migrations.
const TABLES = [
  'users', 'tenants', 'products', 'product_categories', 'customers', 'addresses',
  'orders', 'order_items', 'wishlists', 'discount_codes', 'store_about', 'store_branches',
  'product_reviews', 'review_reports', 'store_banners', 'store_promotions',
  'store_promotion_products', 'product_tags', 'product_tag_assignments', 'publish_logs',
]

async function main() {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(', ')} CASCADE;`)
  console.log(`Truncated ${TABLES.length} tables. Schema and migration history untouched.`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
