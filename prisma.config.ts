import 'dotenv/config'
import { defineConfig } from 'prisma/config'

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
 *
 * Falls back to DATABASE_URL when DATABASE_URL_SERVICE_ROLE isn't set — CI's Postgres is a
 * plain local service container, not pooled at all, so the distinction doesn't apply there.
 * Using the throwing `env()` helper here would make `prisma generate` (which runs on every
 * `npm ci` via postinstall, including in CI) fail hard rather than fall back.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL_SERVICE_ROLE ?? process.env.DATABASE_URL,
  },
})
