CREATE TABLE "slide_decks" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "slides" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "slide_decks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "slide_decks_campaignId_sortOrder_idx" ON "slide_decks"("campaignId", "sortOrder");

ALTER TABLE "slide_decks" ADD CONSTRAINT "slide_decks_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "slide_decks" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "campaign_shows" (
    "campaignId" TEXT NOT NULL,
    "deckId" TEXT,
    "deckTitle" TEXT,
    "slide" JSONB,
    "nextImageUrl" TEXT,
    "audio" JSONB,
    "seq" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "campaign_shows_pkey" PRIMARY KEY ("campaignId")
);

ALTER TABLE "campaign_shows" ADD CONSTRAINT "campaign_shows_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_shows" ENABLE ROW LEVEL SECURITY;
