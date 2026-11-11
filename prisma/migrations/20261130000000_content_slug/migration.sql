-- Partial unique index: Prisma schema cannot express a WHERE clause, so it lives in SQL only.
-- slug is import-layer identity metadata; NULL rows (legacy/user-made) are not constrained.

ALTER TABLE "units" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "units_campaignId_slug_key" ON "units" ("campaignId", "slug") WHERE "slug" IS NOT NULL;

ALTER TABLE "spells" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "spells_campaignId_slug_key" ON "spells" ("campaignId", "slug") WHERE "slug" IS NOT NULL;

ALTER TABLE "spell_groups" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "spell_groups_campaignId_slug_key" ON "spell_groups" ("campaignId", "slug") WHERE "slug" IS NOT NULL;

ALTER TABLE "artifacts" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "artifacts_campaignId_slug_key" ON "artifacts" ("campaignId", "slug") WHERE "slug" IS NOT NULL;

ALTER TABLE "artifact_sets" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "artifact_sets_campaignId_slug_key" ON "artifact_sets" ("campaignId", "slug") WHERE "slug" IS NOT NULL;

ALTER TABLE "skill_trees" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "skill_trees_campaignId_slug_key" ON "skill_trees" ("campaignId", "slug") WHERE "slug" IS NOT NULL;

ALTER TABLE "campaign_tracks" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "campaign_tracks_campaignId_slug_key" ON "campaign_tracks" ("campaignId", "slug") WHERE "slug" IS NOT NULL;

ALTER TABLE "skills" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "skills_campaignId_slug_key" ON "skills" ("campaignId", "slug") WHERE "slug" IS NOT NULL;

ALTER TABLE "races" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "races_campaignId_slug_key" ON "races" ("campaignId", "slug") WHERE "slug" IS NOT NULL;

ALTER TABLE "classes" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "classes_campaignId_slug_key" ON "classes" ("campaignId", "slug") WHERE "slug" IS NOT NULL;

ALTER TABLE "feats" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "feats_campaignId_slug_key" ON "feats" ("campaignId", "slug") WHERE "slug" IS NOT NULL;

ALTER TABLE "backgrounds" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "backgrounds_campaignId_slug_key" ON "backgrounds" ("campaignId", "slug") WHERE "slug" IS NOT NULL;

ALTER TABLE "main_skills" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "main_skills_campaignId_slug_key" ON "main_skills" ("campaignId", "slug") WHERE "slug" IS NOT NULL;

ALTER TABLE "careers" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "careers_campaignId_slug_key" ON "careers" ("campaignId", "slug") WHERE "slug" IS NOT NULL;

ALTER TABLE "units_base" ADD COLUMN "slug" TEXT;
CREATE INDEX "units_base_sourceCampaignId_slug_idx" ON "units_base" ("sourceCampaignId", "slug");

ALTER TABLE "spells_base" ADD COLUMN "slug" TEXT;
CREATE INDEX "spells_base_sourceCampaignId_slug_idx" ON "spells_base" ("sourceCampaignId", "slug");

ALTER TABLE "spell_groups_base" ADD COLUMN "slug" TEXT;
CREATE INDEX "spell_groups_base_sourceCampaignId_slug_idx" ON "spell_groups_base" ("sourceCampaignId", "slug");

ALTER TABLE "artifacts_base" ADD COLUMN "slug" TEXT;
CREATE INDEX "artifacts_base_sourceCampaignId_slug_idx" ON "artifacts_base" ("sourceCampaignId", "slug");

ALTER TABLE "artifact_sets_base" ADD COLUMN "slug" TEXT;
CREATE INDEX "artifact_sets_base_sourceCampaignId_slug_idx" ON "artifact_sets_base" ("sourceCampaignId", "slug");

ALTER TABLE "skill_trees_base" ADD COLUMN "slug" TEXT;
CREATE INDEX "skill_trees_base_sourceCampaignId_slug_idx" ON "skill_trees_base" ("sourceCampaignId", "slug");

ALTER TABLE "campaign_tracks_base" ADD COLUMN "slug" TEXT;
CREATE INDEX "campaign_tracks_base_sourceCampaignId_slug_idx" ON "campaign_tracks_base" ("sourceCampaignId", "slug");

ALTER TABLE "skills_base" ADD COLUMN "slug" TEXT;
CREATE INDEX "skills_base_sourceCampaignId_slug_idx" ON "skills_base" ("sourceCampaignId", "slug");

ALTER TABLE "races_base" ADD COLUMN "slug" TEXT;
CREATE INDEX "races_base_sourceCampaignId_slug_idx" ON "races_base" ("sourceCampaignId", "slug");

ALTER TABLE "classes_base" ADD COLUMN "slug" TEXT;
CREATE INDEX "classes_base_sourceCampaignId_slug_idx" ON "classes_base" ("sourceCampaignId", "slug");

ALTER TABLE "feats_base" ADD COLUMN "slug" TEXT;
CREATE INDEX "feats_base_sourceCampaignId_slug_idx" ON "feats_base" ("sourceCampaignId", "slug");

ALTER TABLE "backgrounds_base" ADD COLUMN "slug" TEXT;
CREATE INDEX "backgrounds_base_sourceCampaignId_slug_idx" ON "backgrounds_base" ("sourceCampaignId", "slug");

ALTER TABLE "main_skills_base" ADD COLUMN "slug" TEXT;
CREATE INDEX "main_skills_base_sourceCampaignId_slug_idx" ON "main_skills_base" ("sourceCampaignId", "slug");

ALTER TABLE "careers_base" ADD COLUMN "slug" TEXT;
CREATE INDEX "careers_base_sourceCampaignId_slug_idx" ON "careers_base" ("sourceCampaignId", "slug");
