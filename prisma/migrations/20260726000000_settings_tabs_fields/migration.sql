ALTER TABLE "tenants" ADD COLUMN "notification_preferences" JSONB;
ALTER TABLE "store_about" ADD COLUMN "owner_name" TEXT;
ALTER TABLE "store_about" ADD COLUMN "owner_title" TEXT;
ALTER TABLE "store_about" ADD COLUMN "gallery_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "tenants" ADD COLUMN "ready_to_go_live_notified_at" TIMESTAMPTZ;
ALTER TABLE "product_categories" ADD COLUMN "department" VARCHAR(20);
