CREATE TABLE "campaign_source_syncs" (
    "campaignId" TEXT NOT NULL,
    "sourceCampaignId" TEXT NOT NULL,
    "baseline" JSONB NOT NULL,
    "ignored" JSONB NOT NULL DEFAULT '{}',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaign_source_syncs_pkey" PRIMARY KEY ("campaignId")
);

ALTER TABLE "campaign_source_syncs" ADD CONSTRAINT "campaign_source_syncs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_source_syncs" ENABLE ROW LEVEL SECURITY;
