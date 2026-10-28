-- AlterTable
ALTER TABLE "campaign_shows" ADD COLUMN     "battle" JSONB;

-- AlterTable
ALTER TABLE "slide_decks" ADD COLUMN     "scenarioPageId" TEXT;

-- CreateIndex
CREATE INDEX "slide_decks_scenarioPageId_idx" ON "slide_decks"("scenarioPageId");

-- AddForeignKey
ALTER TABLE "slide_decks" ADD CONSTRAINT "slide_decks_scenarioPageId_fkey" FOREIGN KEY ("scenarioPageId") REFERENCES "scenario_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

