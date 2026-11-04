ALTER TABLE "campaigns" ADD COLUMN "contentVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "campaign_source_syncs" ADD COLUMN "sourceVersion" INTEGER;
