-- Adds State to the store address, ahead of City per onboarding field ordering.
ALTER TABLE "store_branches" ADD COLUMN "state" TEXT;
