-- AlterTable: Add morale column to characters
ALTER TABLE "characters" ADD COLUMN "morale" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Add morale column to units
ALTER TABLE "units" ADD COLUMN "morale" INTEGER NOT NULL DEFAULT 0;
