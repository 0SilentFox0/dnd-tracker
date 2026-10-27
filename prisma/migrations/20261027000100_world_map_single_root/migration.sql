-- Partial unique index: Prisma schema cannot express a WHERE clause, so it lives in SQL only.
-- Guarantees one root map (no parent marker) per campaign even under concurrent creates.
CREATE UNIQUE INDEX "world_maps_campaignId_root_key" ON "world_maps"("campaignId") WHERE "parentMarkerId" IS NULL;
