-- Remove school column
ALTER TABLE "spells" DROP COLUMN IF EXISTS "school";

-- Add damageElement column back
ALTER TABLE "spells" ADD COLUMN IF NOT EXISTS "damageElement" TEXT;

-- Remove damageDice column
ALTER TABLE "spells" DROP COLUMN IF EXISTS "damageDice";

-- Add target column
ALTER TABLE "spells" ADD COLUMN IF NOT EXISTS "target" TEXT;

-- Add damageModifier column
ALTER TABLE "spells" ADD COLUMN IF NOT EXISTS "damageModifier" TEXT;

-- Add healModifier column
ALTER TABLE "spells" ADD COLUMN IF NOT EXISTS "healModifier" TEXT;

-- Add diceCount column
ALTER TABLE "spells" ADD COLUMN IF NOT EXISTS "diceCount" INTEGER;

-- Add diceType column
ALTER TABLE "spells" ADD COLUMN IF NOT EXISTS "diceType" TEXT;
