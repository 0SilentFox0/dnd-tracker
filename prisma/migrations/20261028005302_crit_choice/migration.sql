-- AlterTable
ALTER TABLE "battle_scenes" ADD COLUMN     "pendingCritChoice" JSONB;

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "critChoiceByDm" BOOLEAN NOT NULL DEFAULT false;
