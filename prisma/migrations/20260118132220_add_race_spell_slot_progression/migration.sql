-- Add spellSlotProgression field to races table
ALTER TABLE "races" ADD COLUMN IF NOT EXISTS "spellSlotProgression" JSONB DEFAULT '[]';
