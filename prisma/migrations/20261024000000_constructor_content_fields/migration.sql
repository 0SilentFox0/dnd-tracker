ALTER TABLE "spells" ADD COLUMN "fx" JSONB;
ALTER TABLE "spell_groups" ADD COLUMN "color" TEXT, ADD COLUMN "icon" TEXT;
ALTER TABLE "main_skills" ADD COLUMN "role" TEXT;
