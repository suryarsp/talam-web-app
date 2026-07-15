import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  // ── Tenant: D'Mystique Boutique ──
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'dmystique' },
    create: {
      slug: 'dmystique',
      name: "D'Mystique Boutique",
      ownerId: '00000000-0000-0000-0000-000000000001',
      tagline: 'Handpicked Indian Fashion for Every Occasion',
      brandColor: '#E8577E',
      storeType: 'ethnic_wear',
      contactPhone: '+91 98765 43210',
      contactEmail: 'hello@dmystique.com',
      whatsappNumber: '919876543210',
      showWhatsappButton: true,
      freeDeliveryAbove: 999,
      shippingFee: 79,
      deliveryEstimateText: '5–7 business days',
      returnWindowDays: 7,
      trustBadgeText: '100% authentic, handpicked by Meena',
      tier: 'pro',
    },
    update: {
      name: "D'Mystique Boutique",
      tagline: 'Handpicked Indian Fashion for Every Occasion',
      brandColor: '#E8577E',
      storeType: 'ethnic_wear',
      contactPhone: '+91 98765 43210',
      contactEmail: 'hello@dmystique.com',
      whatsappNumber: '919876543210',
      freeDeliveryAbove: 999,
      shippingFee: 79,
      deliveryEstimateText: '5–7 business days',
      returnWindowDays: 7,
      trustBadgeText: '100% authentic, handpicked by Meena',
    },
  })

  const tid = tenant.id

  // ── Store About ──
  await prisma.storeAbout.upsert({
    where: { tenantId: tid },
    create: {
      tenantId: tid,
      storyTitle: 'Handcrafted in India,\nMade for You',
      description:
        "D'Mystique Boutique has been curating handpicked ethnic wear since 1995. Every piece is sourced directly from weavers across Tamil Nadu and beyond.",
      instagramUrl: 'https://instagram.com/dmystique',
      facebookUrl: 'https://facebook.com/dmystique',
      youtubeUrl: 'https://youtube.com/@dmystique',
    },
    update: {},
  })

  // ── Branch ──
  const existingBranch = await prisma.storeBranch.findFirst({ where: { tenantId: tid } })
  const branchData = {
    name: 'Main Store',
    address: '12, 2nd Avenue, Anna Nagar',
    city: 'Chennai — 600040',
    hours: 'Mon – Sat: 10 AM – 7 PM\nSunday: Closed',
    phone: '+91 98765 43210',
  }
  if (existingBranch) {
    await prisma.storeBranch.update({ where: { id: existingBranch.id }, data: branchData })
  } else {
    await prisma.storeBranch.create({ data: { ...branchData, tenantId: tid } })
  }

  // ── Categories (6) ──
  const catData = [
    { name: 'Sarees', slug: 'sarees', sortOrder: 0 },
    { name: 'Kurtis', slug: 'kurtis', sortOrder: 1 },
    { name: 'Dupattas', slug: 'dupattas', sortOrder: 2 },
    { name: 'Sets & Suits', slug: 'sets-suits', sortOrder: 3 },
    { name: 'Lehengas', slug: 'lehengas', sortOrder: 4 },
    { name: 'Accessories', slug: 'accessories', sortOrder: 5 },
  ]
  const categories: Record<string, { id: string }> = {}
  for (const c of catData) {
    categories[c.slug] = await prisma.productCategory.upsert({
      where: { tenantId_slug: { tenantId: tid, slug: c.slug } },
      create: { ...c, tenantId: tid },
      update: {},
    })
  }

  // ── Products (12) — from mock-data.ts ──
  const productData = [
    {
      name: 'Kanjivaram Silk Saree', slug: 'kanjivaram-silk-saree',
      description: 'Handwoven Kanjivaram silk saree with rich zari work and a contrasting pallu. Made from pure mulberry silk with traditional temple border motifs. The saree comes with a matching blouse piece.\n\nCare: Dry clean only. Store in muslin cloth.',
      price: 2499, comparePrice: 3299, catSlug: 'sarees',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      images: [
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600',
        'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=600',
        'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600',
      ],
      stockBySize: { XS: 2, S: 5, M: 8, L: 4, XL: 1 },
      daysAgo: 30,
    },
    {
      name: 'Block Print Kurti Set', slug: 'block-print-kurti-set',
      description: 'Hand block printed cotton kurti set featuring Jaipur ajrakh prints. The set includes a straight-cut kurti with side slits, matching palazzo pants, and a printed dupatta.\n\nFabric: 100% cotton\nWash: Machine wash cold, gentle cycle',
      price: 1299, comparePrice: 1899, catSlug: 'kurtis',
      sizes: ['S', 'M', 'L', 'XL'],
      images: [
        'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=600',
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600',
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
      ],
      stockBySize: { S: 12, M: 15, L: 10, XL: 6 },
      daysAgo: 5,
    },
    {
      name: 'Zari Border Dupatta', slug: 'zari-border-dupatta',
      description: 'Lightweight Chanderi silk dupatta with hand-embroidered zari border. The sheer fabric drapes beautifully and adds elegance to any outfit.\n\nDimensions: 2.5m × 1m\nFabric: Chanderi silk blend',
      price: 699, comparePrice: 999, catSlug: 'dupattas',
      sizes: ['Free Size'],
      images: [
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600',
        'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600',
      ],
      stockBySize: { 'Free Size': 20 },
      daysAgo: 12,
    },
    {
      name: 'Anarkali Suit Set', slug: 'anarkali-suit-set',
      description: 'Flowing georgette anarkali with intricate thread embroidery on the yoke and sleeves. Comes with a matching churidar and net dupatta with scalloped edges.\n\nFabric: Pure georgette\nLining: Crepe\nCare: Dry clean recommended',
      price: 2099, comparePrice: 2499, catSlug: 'sets-suits',
      sizes: ['S', 'M', 'L'],
      images: [
        'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600',
        'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=600',
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
      ],
      stockBySize: { S: 4, M: 7, L: 3 },
      daysAgo: 20,
    },
    {
      name: 'Pochampally Ikat Saree', slug: 'pochampally-ikat-saree',
      description: 'Authentic Pochampally Ikat saree handwoven by master artisans of Telangana. Features the signature diamond motifs created using the resist-dyeing technique.\n\nFabric: Handloom cotton-silk\nWeight: 550g\nCare: Dry clean only',
      price: 1899, comparePrice: null, catSlug: 'sarees',
      sizes: ['M', 'L', 'XL'],
      images: [
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600',
      ],
      stockBySize: { M: 3, L: 5, XL: 2 },
      daysAgo: 2,
    },
    {
      name: 'Printed Salwar Kameez', slug: 'printed-salwar-kameez',
      description: 'Breezy cotton lawn salwar kameez with digital print in floral motifs. Relaxed A-line silhouette perfect for everyday wear.\n\nFabric: Cotton lawn\nWash: Machine washable',
      price: 1099, comparePrice: null, catSlug: 'sets-suits',
      sizes: ['S', 'M', 'L', 'XL'],
      images: ['https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=600'],
      stockBySize: { S: 10, M: 15, L: 12, XL: 8 },
      daysAgo: 8,
    },
    {
      name: 'Banarasi Silk Dupatta', slug: 'banarasi-silk-dupatta',
      description: 'Luxurious Banarasi silk dupatta with handwoven gold zari jaal work. Each piece takes 3–4 days to weave on a traditional handloom.\n\nDimensions: 2.5m × 1m\nFabric: Pure Banarasi silk',
      price: 899, comparePrice: 1299, catSlug: 'dupattas',
      sizes: ['Free Size'],
      images: [
        'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600',
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600',
      ],
      stockBySize: { 'Free Size': 15 },
      daysAgo: 18,
    },
    {
      name: 'Teal Chanderi Set', slug: 'teal-chanderi-set',
      description: 'Teal Chanderi cotton kurta with hand-embroidered gotta patti work. Paired with flared palazzo in matching fabric. Festive yet lightweight.\n\nFabric: Chanderi cotton\nCare: Gentle hand wash',
      price: 2199, comparePrice: 2899, catSlug: 'sets-suits',
      sizes: ['XS', 'S', 'M'],
      images: [
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
        'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=600',
        'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600',
      ],
      stockBySize: { XS: 2, S: 4, M: 6 },
      daysAgo: 4,
    },
    {
      name: 'Embroidered Kurti', slug: 'embroidered-kurti',
      description: 'Chikankari embroidered cotton voile kurti with delicate shadow work. Comfortable and breathable, perfect for warm weather.\n\nFabric: Cotton voile\nEmbroidery: Hand chikankari\nWash: Hand wash cold',
      price: 999, comparePrice: null, catSlug: 'kurtis',
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      images: [
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600',
        'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=600',
      ],
      stockBySize: { S: 8, M: 12, L: 10, XL: 6, XXL: 3 },
      daysAgo: 15,
    },
    {
      name: 'Silk Chiffon Dupatta', slug: 'silk-chiffon-dupatta',
      description: 'Elegant silk chiffon dupatta with hand-painted floral borders. Lightweight and versatile, pairs well with both ethnic and fusion outfits.\n\nDimensions: 2.5m × 1m\nFabric: Silk chiffon',
      price: 599, comparePrice: 799, catSlug: 'dupattas',
      sizes: ['Free Size'],
      images: ['https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600'],
      stockBySize: { 'Free Size': 25 },
      daysAgo: 22,
    },
    {
      name: 'Patola Silk Saree', slug: 'patola-silk-saree',
      description: 'Double ikat Patola silk saree from Patan, Gujarat. This rare textile is woven by tying and dyeing both warp and weft threads before weaving. Each saree is unique.\n\nFabric: Pure silk (double ikat)\nWeight: 650g\nCare: Dry clean only',
      price: 3499, comparePrice: 4299, catSlug: 'sarees',
      sizes: ['M', 'L'],
      images: [
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
        'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600',
        'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=600',
      ],
      stockBySize: { M: 1, L: 2 },
      daysAgo: 35,
    },
    {
      name: 'Palazzo Kurti Set', slug: 'palazzo-kurti-set',
      description: 'Rayon blend palazzo kurti set with contemporary geometric print. Easy, flowy silhouette with an elasticated palazzo waistband.\n\nFabric: Rayon blend\nWash: Machine wash cold',
      price: 1599, comparePrice: null, catSlug: 'sets-suits',
      sizes: ['S', 'M', 'L', 'XL'],
      images: [
        'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=600',
        'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600',
      ],
      stockBySize: { S: 6, M: 9, L: 7, XL: 4 },
      daysAgo: 3,
    },
  ]

  const now = Date.now()
  const daysMs = (d: number) => new Date(now - d * 86400_000)

  const products: Record<string, { id: string }> = {}
  for (const p of productData) {
    products[p.slug] = await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: tid, slug: p.slug } },
      create: {
        tenantId: tid,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        comparePrice: p.comparePrice,
        categoryId: categories[p.catSlug].id,
        sizes: p.sizes,
        images: p.images,
        stockBySize: p.stockBySize,
        createdAt: daysMs(p.daysAgo),
      },
      update: {
        name: p.name,
        description: p.description,
        price: p.price,
        comparePrice: p.comparePrice,
        categoryId: categories[p.catSlug].id,
        sizes: p.sizes,
        images: p.images,
        stockBySize: p.stockBySize,
      },
    })
  }

  // ── Customers (8) ──
  const customerNames = [
    'Priya Sharma', 'Lakshmi Menon', 'Ananya Reddy', 'Divya Krishnan',
    'Meera Patel', 'Kavitha Nair', 'Sunitha Rajan', 'Deepa Iyer',
  ]
  const customers: Record<string, { id: string }> = {}
  for (let i = 0; i < customerNames.length; i++) {
    const custId = `00000000-0000-0000-0000-00000000100${i + 1}`
    const existing = await prisma.customer.findUnique({ where: { id: custId } })
    if (!existing) {
      await prisma.customer.create({ data: { id: custId, tenantId: tid, name: customerNames[i] } })
    }
    customers[`cust-${i}`] = { id: custId }
  }

  // ── Reviews ──
  const reviewData = [
    { productSlug: 'kanjivaram-silk-saree', custIdx: 0, rating: 5, comment: "Absolutely stunning saree! The zari work is exquisite and the silk quality is top-notch. Wore it to my cousin's wedding and received so many compliments.", verified: true, daysAgo: 10 },
    { productSlug: 'kanjivaram-silk-saree', custIdx: 1, rating: 5, comment: 'Beautiful drape and the colors are exactly as shown. The blouse piece fabric is generous. Will definitely order again.', verified: true, daysAgo: 15 },
    { productSlug: 'kanjivaram-silk-saree', custIdx: 2, rating: 4, comment: 'Lovely saree overall. The pallu design is gorgeous. Only giving 4 stars because delivery took a bit longer than expected.', verified: true, daysAgo: 20 },
    { productSlug: 'kanjivaram-silk-saree', custIdx: 3, rating: 5, comment: 'This is my third purchase from this store and the quality is consistently excellent. The temple border is intricate and well-finished.', verified: true, daysAgo: 25 },
    { productSlug: 'block-print-kurti-set', custIdx: 4, rating: 4, comment: 'Love the block print pattern! Very comfortable for daily wear. The cotton is soft and breathable.', verified: true, daysAgo: 3 },
    { productSlug: 'block-print-kurti-set', custIdx: 5, rating: 4, comment: "Good quality kurti set. The palazzo fits well and the dupatta is a nice bonus. Colors haven't faded after multiple washes.", verified: true, daysAgo: 7 },
    { productSlug: 'block-print-kurti-set', custIdx: 0, rating: 5, comment: 'Perfect everyday outfit. Ordered M and it fits true to size. The block print has that lovely handmade character.', verified: false, daysAgo: 12 },
    { productSlug: 'zari-border-dupatta', custIdx: 6, rating: 5, comment: 'The Chanderi silk is so soft and the zari border catches light beautifully. Paired it with a plain kurta and it elevated the whole look.', verified: true, daysAgo: 8 },
    { productSlug: 'zari-border-dupatta', custIdx: 1, rating: 5, comment: 'Received it as a gift and I absolutely love it! The craftsmanship is remarkable for this price point.', verified: false, daysAgo: 14 },
    { productSlug: 'anarkali-suit-set', custIdx: 2, rating: 4, comment: 'Gorgeous anarkali with beautiful embroidery. The georgette fabric flows nicely. Wish it came in more colors.', verified: true, daysAgo: 6 },
    { productSlug: 'anarkali-suit-set', custIdx: 7, rating: 5, comment: 'Wore this to a sangeet and it was perfect! Comfortable enough to dance in all night. The net dupatta is delicate but durable.', verified: true, daysAgo: 11 },
    { productSlug: 'pochampally-ikat-saree', custIdx: 3, rating: 5, comment: 'Authentic Pochampally weave — you can feel the quality. The ikat patterns are crisp and symmetrical. A true artisan piece.', verified: true, daysAgo: 1 },
    { productSlug: 'pochampally-ikat-saree', custIdx: 4, rating: 5, comment: 'My favorite saree in my collection now. Light enough for daily wear but elegant enough for pujas.', verified: true, daysAgo: 4 },
    { productSlug: 'patola-silk-saree', custIdx: 5, rating: 5, comment: 'An investment piece worth every rupee. The double ikat technique is visible in the precision of the patterns. Heirloom quality.', verified: true, daysAgo: 9 },
    { productSlug: 'patola-silk-saree', custIdx: 6, rating: 5, comment: "Bought this for my daughter's wedding trousseau. The colors are vibrant and the silk has a beautiful sheen.", verified: true, daysAgo: 16 },
    { productSlug: 'patola-silk-saree', custIdx: 7, rating: 4, comment: 'Stunning saree. The packaging was excellent too — came in a beautiful box. Only wishing it had more size options.', verified: true, daysAgo: 21 },
    { productSlug: 'embroidered-kurti', custIdx: 0, rating: 5, comment: 'The chikankari work is so fine and delicate. Very comfortable in summer. Ordered two more in different sizes for gifting.', verified: true, daysAgo: 5 },
    { productSlug: 'embroidered-kurti', custIdx: 2, rating: 4, comment: 'Beautiful kurti with traditional embroidery. Runs slightly loose — consider sizing down. The cotton quality is excellent.', verified: true, daysAgo: 13 },
  ]

  for (const r of reviewData) {
    const productId = products[r.productSlug].id
    const customerId = customers[`cust-${r.custIdx}`].id
    await prisma.productReview.upsert({
      where: { tenantId_productId_customerId: { tenantId: tid, productId, customerId } },
      create: {
        tenantId: tid,
        productId,
        customerId,
        rating: r.rating,
        comment: r.comment,
        isVerifiedPurchase: r.verified,
        createdAt: daysMs(r.daysAgo),
      },
      update: {},
    })
  }

  // ── Banners (3) — first 3 products ──
  const bannerSlugs = ['kanjivaram-silk-saree', 'block-print-kurti-set', 'zari-border-dupatta']
  // Delete existing banners for this tenant to avoid duplicates
  await prisma.storeBanner.deleteMany({ where: { tenantId: tid } })
  for (let i = 0; i < bannerSlugs.length; i++) {
    await prisma.storeBanner.create({
      data: { tenantId: tid, productId: products[bannerSlugs[i]].id, sortOrder: i },
    })
  }

  // ── Promotions (4) ──
  await prisma.storePromotion.deleteMany({ where: { tenantId: tid } })
  const promos = [
    { offerText: 'Upto 50% off', subtitle: 'Sarees', endsAt: new Date(now + 48 * 3600_000) },
    { offerText: 'Buy 2 Get 1', subtitle: 'Dupattas', endsAt: new Date(now + 48 * 3600_000) },
    { offerText: 'Flat ₹200 off', subtitle: 'Orders above ₹1000', endsAt: new Date(now + 48 * 3600_000) },
    { offerText: 'Free Shipping', subtitle: 'Orders above ₹599', endsAt: null },
  ]
  for (let i = 0; i < promos.length; i++) {
    await prisma.storePromotion.create({
      data: { tenantId: tid, offerText: promos[i].offerText, subtitle: promos[i].subtitle, endsAt: promos[i].endsAt, sortOrder: i },
    })
  }

  // ── Tags (7) + assignments ──
  await prisma.productTagAssignment.deleteMany({ where: { tenantId: tid } })
  await prisma.productTag.deleteMany({ where: { tenantId: tid } })

  const tagData = [
    { name: 'Festive', slug: 'festive', emoji: '🎉', sortOrder: 0 },
    { name: 'Wedding', slug: 'wedding', emoji: '💍', sortOrder: 1 },
    { name: 'Casual', slug: 'casual', emoji: '☀️', sortOrder: 2 },
    { name: 'Office', slug: 'office', emoji: '💼', sortOrder: 3 },
    { name: 'Daily', slug: 'daily', emoji: '🌿', sortOrder: 4 },
    { name: 'Party', slug: 'party', emoji: '🎊', sortOrder: 5 },
    { name: 'Travel', slug: 'travel', emoji: '✈️', sortOrder: 6 },
  ]

  const tags: Record<string, { id: string }> = {}
  for (const t of tagData) {
    tags[t.slug] = await prisma.productTag.create({ data: { ...t, tenantId: tid } })
  }

  // Tag assignments matching the hardcoded occasions in the old store page
  const tagAssignments: [string, string][] = [
    ['kanjivaram-silk-saree', 'festive'],
    ['block-print-kurti-set', 'casual'],
    ['zari-border-dupatta', 'festive'],
    ['anarkali-suit-set', 'wedding'],
    ['pochampally-ikat-saree', 'casual'],
    ['printed-salwar-kameez', 'office'],
    ['banarasi-silk-dupatta', 'wedding'],
    ['teal-chanderi-set', 'festive'],
    ['embroidered-kurti', 'daily'],
    ['silk-chiffon-dupatta', 'party'],
    ['patola-silk-saree', 'wedding'],
    ['palazzo-kurti-set', 'casual'],
  ]

  for (const [prodSlug, tagSlug] of tagAssignments) {
    await prisma.productTagAssignment.create({
      data: { tenantId: tid, productId: products[prodSlug].id, tagId: tags[tagSlug].id },
    })
  }

  console.log(`Seeded D'Mystique Boutique: 12 products, 6 categories, 3 banners, 4 promotions, 7 tags, 18 reviews.`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
