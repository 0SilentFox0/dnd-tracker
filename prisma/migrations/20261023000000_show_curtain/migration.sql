-- AlterTable
ALTER TABLE "campaign_shows" ADD COLUMN     "cover" JSONB,
ADD COLUMN     "curtain" BOOLEAN NOT NULL DEFAULT false;
