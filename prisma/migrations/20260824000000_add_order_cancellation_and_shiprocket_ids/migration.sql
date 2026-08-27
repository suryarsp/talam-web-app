-- Shiprocket's own ids for a shipped order. The AWB already lands in tracking_id; these two
-- are what Shiprocket's dashboard and API are keyed on, so support can find the shipment
-- without re-deriving it from our order id.
ALTER TABLE "orders"
  ADD COLUMN "shiprocket_order_id" TEXT,
  ADD COLUMN "shipment_id"         TEXT,
  ADD COLUMN "courier_name"        TEXT;

-- Manual-refund (COD / UPI) cancellation audit trail. All nullable: the "awaiting
-- verification" state is refund_proof_url IS NOT NULL AND refund_verified_at IS NULL, which
-- avoids adding an OrderStatus value that every status filter in the app would have to learn.
ALTER TABLE "orders"
  ADD COLUMN "refund_proof_url"    TEXT,
  ADD COLUMN "refund_verified_by"  TEXT,
  ADD COLUMN "refund_verified_at"  TIMESTAMPTZ;
