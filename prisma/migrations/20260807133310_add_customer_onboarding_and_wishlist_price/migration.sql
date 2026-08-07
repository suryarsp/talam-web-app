-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferred_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "preferred_size" TEXT;

-- AlterTable
ALTER TABLE "wishlists" ADD COLUMN     "price_at_save" DECIMAL(10,2);
