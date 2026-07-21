-- Customer order links require an unguessable token (not just sequential ARK-####)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "accessToken" TEXT;

-- Backfill existing rows
UPDATE "Order"
SET "accessToken" = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
WHERE "accessToken" IS NULL OR "accessToken" = '';

ALTER TABLE "Order" ALTER COLUMN "accessToken" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_accessToken_key" ON "Order"("accessToken");
