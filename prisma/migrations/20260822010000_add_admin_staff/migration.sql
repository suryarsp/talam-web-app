-- CreateEnum
CREATE TYPE "AdminStaffRole" AS ENUM ('owner', 'support_agent', 'billing_manager', 'growth_analyst');

-- CreateTable
CREATE TABLE "admin_staff" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminStaffRole" NOT NULL DEFAULT 'support_agent',
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "last_active_at" TIMESTAMPTZ,

    CONSTRAINT "admin_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_staff_email_key" ON "admin_staff"("email");
