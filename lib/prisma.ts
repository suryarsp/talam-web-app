import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function makePrisma() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: process.env.NODE_ENV === 'production' ? 1 : 5,
  })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? makePrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function withTenant<T>(
  tenantId: string,
  fn: (client: PrismaClient) => Promise<T>
): Promise<T> {
  // ponytail: set_config(..., true) is transaction-local — must run on the same
  // pooled connection as the query it scopes, or RLS silently hides every row
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`
    return fn(tx as PrismaClient)
  })
}

// Deliberate, audited cross-tenant escape hatch for the super-admin panel (tenant list,
// flagged-orders queue) — queries that inherently span every tenant and structurally can't
// go through `withTenant`, which scopes every query to exactly one tenant via `set_config`.
// No transaction/set_config here on purpose: this is NOT tenant-scoped.
//
// Per docs/2026-07-28-architecture-audit.md finding A1, the app currently connects as a
// BYPASSRLS role, so a bare `prisma` query already reads cross-tenant regardless of RLS
// policies — this "just works" today only because of that connection role. `withSuperAdmin`
// exists so that fact stays a named, reviewable choice instead of scattered bare `prisma`
// calls: if A1 is ever fixed (switching to a non-bypass role), only this function needs a
// role-elevation story, rather than every unscoped call site becoming a silent 403.
export async function withSuperAdmin<T>(fn: (client: PrismaClient) => Promise<T>): Promise<T> {
  return fn(prisma)
}
