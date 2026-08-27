-- Per-product shipping weight in kg. Nullable: every product predating this column has no
-- real weight to backfill, and inventing one per product would be worse than falling back to
-- the tenant-level default below.
ALTER TABLE "products"
  ADD COLUMN "weight" DECIMAL(6,3);

-- Tenant-level fallback weight in kg, used whenever a product's own weight is null. NOT NULL
-- with a default because every Shiprocket rate/serviceability call requires a weight — a null
-- here would mean "no estimate possible" for a shop that simply never filled the field in.
ALTER TABLE "tenants"
  ADD COLUMN "default_shipping_weight" DECIMAL(6,3) NOT NULL DEFAULT 0.5;

-- Courier ETA in days as quoted at checkout. Stored rather than re-derived so an order can
-- reproduce the delivery promise it was placed under, the same reasoning as the stored price
-- breakdown on this table.
ALTER TABLE "orders"
  ADD COLUMN "estimated_delivery_days" INTEGER;
