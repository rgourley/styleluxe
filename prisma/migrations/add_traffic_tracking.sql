-- Add traffic tracking fields to Product table
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "pageViews" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "clicks" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "lastViewedAt" TIMESTAMP(3);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "Product_pageViews_idx" ON "Product"("pageViews");
CREATE INDEX IF NOT EXISTS "Product_clicks_idx" ON "Product"("clicks");

