-- Admin order editing: custom lines already via OrderItem; adjustment + customer-facing note
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "adjustmentCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "adjustmentLabel" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "adminNote" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "adminEditedAt" TIMESTAMP(3);
