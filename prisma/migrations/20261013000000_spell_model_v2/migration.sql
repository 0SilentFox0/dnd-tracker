-- AlterTable
ALTER TABLE "spells" ADD COLUMN     "cost" TEXT NOT NULL DEFAULT 'action',
ADD COLUMN     "dice" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "raceModifiers" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "resolution" JSONB NOT NULL DEFAULT '{"kind":"auto"}',
ADD COLUMN     "spellEffects" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "targeting" JSONB NOT NULL DEFAULT '{"kind":"enemy"}';
