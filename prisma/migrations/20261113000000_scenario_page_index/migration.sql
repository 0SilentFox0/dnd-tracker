CREATE TABLE "scenario_page_index" (
    "pageId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "facts" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scenario_page_index_pkey" PRIMARY KEY ("pageId")
);
CREATE INDEX "scenario_page_index_campaignId_idx" ON "scenario_page_index"("campaignId");
ALTER TABLE "scenario_page_index" ADD CONSTRAINT "scenario_page_index_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "scenario_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scenario_page_index" ENABLE ROW LEVEL SECURITY;
