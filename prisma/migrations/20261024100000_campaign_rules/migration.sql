ALTER TABLE "campaigns" ADD COLUMN "rules" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "battle_scenes" ADD COLUMN "rules" JSONB;
