-- `publish_logs` exists in production (created outside the committed migration history — how
-- isn't recoverable now), so the later `20260726010000_publish_log_items` migration, which
-- ALTERs it, has always applied cleanly there. A fresh database (CI, a new environment) has no
-- such table, so that ALTER fails with "relation does not exist". IF NOT EXISTS makes this a
-- no-op where the table is already present and a real CREATE everywhere else.
CREATE TABLE IF NOT EXISTS "publish_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "published_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "item_count" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,

    CONSTRAINT "publish_logs_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'publish_logs_tenant_id_fkey'
    ) THEN
        ALTER TABLE "publish_logs" ADD CONSTRAINT "publish_logs_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
