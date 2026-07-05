import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function withTenant<T>(
  tenantId: string,
  fn: (client: PrismaClient) => Promise<T>
): Promise<T> {
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`
  return fn(prisma)
}
