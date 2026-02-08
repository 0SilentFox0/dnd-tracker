-- Add effects column (JSON array of effect strings)
ALTER TABLE "spells" ADD COLUMN IF NOT EXISTS "effects" JSONB;

-- Make description optional for spells that use effects instead
ALTER TABLE "spells" ALTER COLUMN "description" DROP NOT NULL;
