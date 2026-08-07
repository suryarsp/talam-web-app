-- AlterTable: product specifications (ordered {label,value} pairs)
ALTER TABLE "products" ADD COLUMN "specifications" JSONB NOT NULL DEFAULT '[]';

-- AlterTable: customer soft-delete + notification prefs
ALTER TABLE "customers" ADD COLUMN "deleted_at" TIMESTAMPTZ;
ALTER TABLE "customers" ADD COLUMN "notify_deals" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "customers" ADD COLUMN "notify_order_updates" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "customers" ADD COLUMN "notify_promotions" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "upi_id" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
