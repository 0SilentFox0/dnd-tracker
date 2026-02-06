-- Add spell enhancement fields to skills table
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "spellEnhancementTypes" JSONB DEFAULT '[]';
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "spellEffectIncrease" INTEGER;
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "spellTargetChange" JSONB;
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "spellAdditionalModifier" JSONB;
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "spellNewSpellId" TEXT;

-- Add foreign key constraint for spellNewSpellId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'skills_spellNewSpellId_fkey'
  ) THEN
    ALTER TABLE "skills" 
    ADD CONSTRAINT "skills_spellNewSpellId_fkey" 
    FOREIGN KEY ("spellNewSpellId") 
    REFERENCES "spells"("id") 
    ON DELETE SET NULL;
  END IF;
END $$;
