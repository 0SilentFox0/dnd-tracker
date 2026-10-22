-- AlterTable
ALTER TABLE "character_inventories" ADD COLUMN     "stash" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- CreateTable
CREATE TABLE "inventory_log" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "delta" JSONB NOT NULL DEFAULT '{}',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_log_characterId_createdAt_idx" ON "inventory_log"("characterId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "inventory_log" ADD CONSTRAINT "inventory_log_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_log" ADD CONSTRAINT "inventory_log_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_log" ENABLE ROW LEVEL SECURITY;
