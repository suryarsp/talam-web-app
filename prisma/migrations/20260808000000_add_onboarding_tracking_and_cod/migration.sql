-- CreateEnum
CREATE TYPE "OnboardingStage" AS ENUM ('business_setup', 'license', 'razorpay', 'store_live');

-- CreateEnum
CREATE TYPE "OnboardingStageStatus" AS ENUM ('not_started', 'in_progress', 'blocked', 'done');

-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'cod';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "dispute_flagged_at" TIMESTAMP(3),
ADD COLUMN     "dispute_reason" TEXT;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "onboarding_stage" "OnboardingStage" DEFAULT 'business_setup',
ADD COLUMN     "onboarding_stage_status" "OnboardingStageStatus" DEFAULT 'not_started',
ADD COLUMN     "suspended_at" TIMESTAMP(3);

