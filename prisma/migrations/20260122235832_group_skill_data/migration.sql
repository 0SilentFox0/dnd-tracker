-- Міграція для згрупованої структури даних скілів
-- Додаємо нові JSON поля для згрупованих даних

-- Додаємо нові поля
ALTER TABLE "skills" 
ADD COLUMN IF NOT EXISTS "basicInfo" JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "combatStats" JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "spellData" JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "spellEnhancementData" JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "mainSkillData" JSONB DEFAULT '{}';

-- Переносимо дані з існуючих полів в згруповані структури
UPDATE "skills" SET
  "basicInfo" = jsonb_build_object(
    'name', "name",
    'description', COALESCE("description", ''),
    'icon', COALESCE("icon", ''),
    'races', COALESCE("races", '[]'::jsonb),
    'isRacial', COALESCE("isRacial", false)
  ),
  "combatStats" = jsonb_build_object(
    'damage', "damage",
    'armor', "armor",
    'speed', "speed",
    'physicalResistance', "physicalResistance",
    'magicalResistance', "magicalResistance"
  ),
  "spellData" = jsonb_build_object(
    'spellId', "spellId",
    'spellGroupId', "spellGroupId"
  ),
  "spellEnhancementData" = jsonb_build_object(
    'spellEnhancementTypes', COALESCE("spellEnhancementTypes", '[]'::jsonb),
    'spellEffectIncrease', "spellEffectIncrease",
    'spellTargetChange', "spellTargetChange",
    'spellAdditionalModifier', "spellAdditionalModifier",
    'spellNewSpellId', "spellNewSpellId"
  ),
  "mainSkillData" = jsonb_build_object(
    'mainSkillId', "mainSkillId"
  )
WHERE "basicInfo" = '{}'::jsonb OR "basicInfo" IS NULL;

-- Встановлюємо значення за замовчуванням для нових записів
ALTER TABLE "skills" 
ALTER COLUMN "basicInfo" SET DEFAULT '{}'::jsonb,
ALTER COLUMN "combatStats" SET DEFAULT '{}'::jsonb,
ALTER COLUMN "spellData" SET DEFAULT '{}'::jsonb,
ALTER COLUMN "spellEnhancementData" SET DEFAULT '{}'::jsonb,
ALTER COLUMN "mainSkillData" SET DEFAULT '{}'::jsonb;
