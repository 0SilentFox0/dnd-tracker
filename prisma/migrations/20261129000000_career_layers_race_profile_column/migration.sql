ALTER TABLE "careers" ADD COLUMN "sourceId" TEXT, ADD COLUMN "sourceHash" TEXT;

CREATE INDEX "careers_campaignId_sourceId_idx" ON "careers"("campaignId", "sourceId");

CREATE TABLE "careers_base" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "class" TEXT,
    "tiers" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceCampaignId" TEXT NOT NULL,
    "validFrom" INTEGER NOT NULL,
    "validTo" INTEGER,

    CONSTRAINT "careers_base_pkey" PRIMARY KEY ("id","validFrom")
);

CREATE INDEX "careers_base_sourceCampaignId_validFrom_validTo_idx" ON "careers_base"("sourceCampaignId", "validFrom", "validTo");

ALTER TABLE "careers_base" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "races" ADD COLUMN "profile" JSONB;
ALTER TABLE "races_base" ADD COLUMN "profile" JSONB;

UPDATE "races" r SET "profile" = rp."profile" FROM "race_profiles" rp WHERE rp."raceId" = r."id";
