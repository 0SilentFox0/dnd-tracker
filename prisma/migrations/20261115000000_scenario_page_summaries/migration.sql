-- CreateTable
CREATE TABLE "scenario_page_summaries" (
    "pageId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "summary" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scenario_page_summaries_pkey" PRIMARY KEY ("pageId")
);

-- CreateIndex
CREATE INDEX "scenario_page_summaries_campaignId_idx" ON "scenario_page_summaries"("campaignId");

-- AddForeignKey
ALTER TABLE "scenario_page_summaries" ADD CONSTRAINT "scenario_page_summaries_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "scenario_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "scenario_page_summaries" ENABLE ROW LEVEL SECURITY;
