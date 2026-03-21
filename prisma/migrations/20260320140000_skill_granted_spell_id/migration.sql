-- Skill.grantedSpellId + FK (було в schema без міграції — prod без колонки давав 500 на findMany skills)
ALTER TABLE "skills" ADD COLUMN IF NOT EXISTS "grantedSpellId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'skills_grantedSpellId_fkey'
  ) THEN
    ALTER TABLE "skills"
    ADD CONSTRAINT "skills_grantedSpellId_fkey"
    FOREIGN KEY ("grantedSpellId")
    REFERENCES "spells"("id")
    ON DELETE SET NULL;
  END IF;
END $$;
