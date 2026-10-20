ALTER TABLE "battle_scenes" ADD COLUMN "audio" JSONB;

CREATE TABLE "campaign_tracks" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT,
    "youtubeId" TEXT,
    "durationSec" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaign_tracks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "campaign_tracks_campaignId_sortOrder_idx" ON "campaign_tracks"("campaignId", "sortOrder");

ALTER TABLE "campaign_tracks" ADD CONSTRAINT "campaign_tracks_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_tracks" ENABLE ROW LEVEL SECURITY;
