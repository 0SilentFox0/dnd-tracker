-- AlterTable
ALTER TABLE "characters" ADD COLUMN "resources" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "characters" ADD COLUMN "inspiration" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "character_logs" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "kind" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "character_logs_characterId_createdAt_idx" ON "character_logs"("characterId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "character_logs" ADD CONSTRAINT "character_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_logs" ADD CONSTRAINT "character_logs_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "character_logs" ENABLE ROW LEVEL SECURITY;
