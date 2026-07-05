import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'silk' } })
  if (!tenant) {
    throw new Error("No tenant with slug 'silk' found — seed a tenant first.")
  }

  const categories = await Promise.all(
    [
      { name: 'Sarees', slug: 'sarees', sortOrder: 0 },
      { name: 'Kurtis', slug: 'kurtis', sortOrder: 1 },
      { name: 'Crafts', slug: 'crafts', sortOrder: 2 },
    ].map((c) =>
      prisma.productCategory.upsert({
        where: { tenantId_slug: { tenantId: tenant.id, slug: c.slug } },
        create: { ...c, tenantId: tenant.id },
        update: {},
      })
    )
  )
  const [sarees, kurtis, crafts] = categories

  const products = [
    {
      name: 'Silk Saree',
      slug: 'silk-saree',
      price: '2499',
      comparePrice: '3299',
      categoryId: sarees.id,
      sizes: ['S', 'M', 'L'],
      images: ['https://res.cloudinary.com/demo/image/upload/woman.jpg'],
      stockBySize: { S: 4, M: 6, L: 2 },
    },
    {
      name: 'Kurti Set',
      slug: 'kurti-set',
      price: '1299',
      comparePrice: null,
      categoryId: kurtis.id,
      sizes: ['S', 'M', 'L', 'XL'],
      images: ['https://res.cloudinary.com/demo/image/upload/sheep.jpg'],
      stockBySize: { S: 3, M: 5, L: 5, XL: 1 },
    },
    {
      name: 'Jute Bags',
      slug: 'jute-bags',
      price: '699',
      comparePrice: null,
      categoryId: crafts.id,
      sizes: [],
      images: ['https://res.cloudinary.com/demo/image/upload/shoes.jpg'],
      stockBySize: {},
    },
    {
      name: 'Wood Craft',
      slug: 'wood-craft',
      price: '1999',
      comparePrice: null,
      categoryId: crafts.id,
      sizes: [],
      images: ['https://res.cloudinary.com/demo/image/upload/couple.jpg'],
      stockBySize: {},
    },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: p.slug } },
      create: { ...p, tenantId: tenant.id },
      update: p,
    })
  }

  console.log(`Seeded ${products.length} products across ${categories.length} categories for tenant '${tenant.slug}'.`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
