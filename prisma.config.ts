import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

/**
 * The CLI (migrate, db push, studio) needs a *session* connection, not the transaction
 * pooler the app runs on.
 *
 * DATABASE_URL points at Supabase's PgBouncer transaction pooler on :6543, which cannot
 * run migrations — DDL and advisory locks need a session that survives more than a single
 * statement, so `prisma migrate` hangs there with no error rather than failing loudly.
 * DATABASE_URL_SERVICE_ROLE is the same database on :5432 (session pooler), which works.
 *
 * This only affects CLI commands. The running app still connects via DATABASE_URL through
 * the adapter in lib/prisma.ts, which is what we want the pooler for.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL_SERVICE_ROLE'),
  },
})
