-- Orders must be able to reproduce their own invoice: storing only `total` made the
-- breakdown underivable once coupons existed (a single delta cannot split back into
-- shipping and discount). Defaults keep existing rows valid.
ALTER TABLE "orders"
  ADD COLUMN "items_total"   DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "discount"      DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "shipping_fee"  DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "discount_code" TEXT;

-- Pre-existing orders predate coupons, so their items total equals what was charged.
UPDATE "orders" SET "items_total" = "total" WHERE "items_total" = 0;
