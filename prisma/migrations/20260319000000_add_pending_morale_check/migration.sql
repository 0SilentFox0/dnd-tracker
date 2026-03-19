-- AlterTable
ALTER TABLE "battle_scenes" ADD COLUMN IF NOT EXISTS "pendingMoraleCheck" JSONB;
