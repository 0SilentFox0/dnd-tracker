-- AlterTable
ALTER TABLE "races" ADD COLUMN "choices" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "spells" ADD COLUMN "lists" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "classes" ADD COLUMN "spellList" TEXT;

-- AlterTable
ALTER TABLE "characters" ADD COLUMN "feats" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "raceChoices" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "feats" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "type" TEXT NOT NULL DEFAULT 'general',
    "prerequisite" JSONB NOT NULL DEFAULT '{}',
    "repeatable" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "abilities" JSONB NOT NULL DEFAULT '[]',
    "choices" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceId" TEXT,
    "sourceHash" TEXT,

    CONSTRAINT "feats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feats_campaignId_name_idx" ON "feats"("campaignId", "name");

-- AddForeignKey
ALTER TABLE "feats" ADD CONSTRAINT "feats_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feats" ENABLE ROW LEVEL SECURITY;
