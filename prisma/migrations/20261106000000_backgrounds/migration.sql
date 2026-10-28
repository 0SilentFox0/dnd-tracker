CREATE TABLE "backgrounds" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "icon" TEXT,
  "description" TEXT,
  "choices" JSONB NOT NULL DEFAULT '[]',
  "skillProficiencies" JSONB NOT NULL DEFAULT '[]',
  "toolProficiencies" JSONB NOT NULL DEFAULT '[]',
  "originFeatId" TEXT,
  "equipmentText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "sourceId" TEXT,
  "sourceHash" TEXT,
  CONSTRAINT "backgrounds_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "backgrounds_campaignId_name_idx" ON "backgrounds"("campaignId", "name");
CREATE INDEX "backgrounds_originFeatId_idx" ON "backgrounds"("originFeatId");
ALTER TABLE "backgrounds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "characters" ADD COLUMN "backgroundId" TEXT,
  ADD COLUMN "backgroundChoices" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "backgroundFeatPicks" JSONB NOT NULL DEFAULT '{}';
CREATE INDEX "characters_backgroundId_idx" ON "characters"("backgroundId");
ALTER TABLE "characters" ADD CONSTRAINT "characters_backgroundId_fkey" FOREIGN KEY ("backgroundId") REFERENCES "backgrounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
