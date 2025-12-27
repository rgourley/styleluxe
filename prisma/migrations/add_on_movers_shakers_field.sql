-- Add field to track if product is currently on Amazon Movers & Shakers
-- This allows us to adjust scores when products drop off the list

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "onMoversShakers" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "lastSeenOnMoversShakers" TIMESTAMP(3);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "Product_onMoversShakers_idx" ON "Product"("onMoversShakers");


