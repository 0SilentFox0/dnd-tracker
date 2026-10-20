CREATE TABLE "scenario_pages" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "arc" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "characterId" TEXT,
    "content" JSONB NOT NULL DEFAULT '{"legend":[],"sections":[]}',
    "searchText" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "scenario_pages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "scenario_page_versions" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "scenario_page_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scenario_pages_campaignId_sortOrder_idx" ON "scenario_pages"("campaignId", "sortOrder");

CREATE INDEX "scenario_pages_characterId_idx" ON "scenario_pages"("characterId");

CREATE INDEX "scenario_page_versions_pageId_createdAt_idx" ON "scenario_page_versions"("pageId", "createdAt");

ALTER TABLE "scenario_pages" ADD CONSTRAINT "scenario_pages_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "scenario_pages" ADD CONSTRAINT "scenario_pages_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "scenario_page_versions" ADD CONSTRAINT "scenario_page_versions_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "scenario_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "scenario_pages" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "scenario_page_versions" ENABLE ROW LEVEL SECURITY;
