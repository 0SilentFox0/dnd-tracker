-- AlterTable
ALTER TABLE "races" ADD COLUMN     "color" TEXT;

-- AlterTable
ALTER TABLE "units" ADD COLUMN     "raceId" TEXT;

-- CreateIndex
CREATE INDEX "units_raceId_idx" ON "units"("raceId");

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "races"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: units.raceId by exact race name within the campaign (units.race first, then unit group name); oldest race wins on duplicate names
UPDATE "units" u
SET "raceId" = (
  SELECT r."id" FROM "races" r
  WHERE r."campaignId" = u."campaignId" AND r."name" = u."race"
  ORDER BY r."createdAt" ASC, r."id" ASC
  LIMIT 1
)
WHERE u."raceId" IS NULL AND u."race" IS NOT NULL;

UPDATE "units" u
SET "raceId" = (
  SELECT r."id" FROM "races" r
  JOIN "unit_groups" g ON g."id" = u."groupId"
  WHERE r."campaignId" = u."campaignId" AND r."name" = g."name"
  ORDER BY r."createdAt" ASC, r."id" ASC
  LIMIT 1
)
WHERE u."raceId" IS NULL AND u."groupId" IS NOT NULL;

-- Backfill: races.color from the palette, per campaign in creation order
UPDATE "races" r
SET "color" = (ARRAY['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'])[1 + ((n.rn - 1) % 7)]
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "campaignId" ORDER BY "createdAt", "id") AS rn
  FROM "races"
) n
WHERE r."id" = n."id" AND r."color" IS NULL;
