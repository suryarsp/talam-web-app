-- AlterTable
-- Nullable with no SQL-level default, matching payment_config — defaulting is handled in
-- application code via normalizeShippingConfig (lib/shipping/shipping-config.ts).
ALTER TABLE "tenants" ADD COLUMN     "shipping_config" JSONB;

-- CreateTable
CREATE TABLE "shipping_credentials" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'shiprocket',
    "email_cipher" TEXT NOT NULL,
    "password_cipher" TEXT NOT NULL,
    "webhook_token" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "shipping_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipping_credentials_tenant_id_key" ON "shipping_credentials"("tenant_id");

-- AddForeignKey
ALTER TABLE "shipping_credentials" ADD CONSTRAINT "shipping_credentials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
