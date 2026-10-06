-- Re-backfill units.raceId for units written by the old deploy during the release-1 build; same expressions as 20261011000000_units_race_id.
UPDATE "units" u
SET "raceId" = (
  SELECT r."id" FROM "races" r
  WHERE r."campaignId" = u."campaignId" AND r."name" = u."race"
  ORDER BY r."createdAt" ASC, r."id" ASC
  LIMIT 1
)
WHERE u."raceId" IS NULL AND u."race" IS NOT NULL;

UPDATE "units" u
SET "raceId" = (
  SELECT r."id" FROM "races" r
  JOIN "unit_groups" g ON g."id" = u."groupId"
  WHERE r."campaignId" = u."campaignId" AND r."name" = g."name"
  ORDER BY r."createdAt" ASC, r."id" ASC
  LIMIT 1
)
WHERE u."raceId" IS NULL AND u."groupId" IS NOT NULL;

-- abilities: default first (old deploy may still insert NULL), then backfill NULL/non-array, then NOT NULL below
ALTER TABLE "skills" ALTER COLUMN "abilities" SET DEFAULT '[]';
ALTER TABLE "races" ALTER COLUMN "abilities" SET DEFAULT '[]';
ALTER TABLE "artifacts" ALTER COLUMN "abilities" SET DEFAULT '[]';
ALTER TABLE "artifact_sets" ALTER COLUMN "abilities" SET DEFAULT '[]';
ALTER TABLE "units" ALTER COLUMN "abilities" SET DEFAULT '[]';

UPDATE "skills" SET "abilities" = '[]' WHERE "abilities" IS NULL OR jsonb_typeof("abilities") <> 'array';
UPDATE "races" SET "abilities" = '[]' WHERE "abilities" IS NULL OR jsonb_typeof("abilities") <> 'array';
UPDATE "artifacts" SET "abilities" = '[]' WHERE "abilities" IS NULL OR jsonb_typeof("abilities") <> 'array';
UPDATE "artifact_sets" SET "abilities" = '[]' WHERE "abilities" IS NULL OR jsonb_typeof("abilities") <> 'array';
UPDATE "units" SET "abilities" = '[]' WHERE "abilities" IS NULL OR jsonb_typeof("abilities") <> 'array';

-- DropForeignKey
ALTER TABLE "racial_abilities" DROP CONSTRAINT "racial_abilities_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "unit_groups" DROP CONSTRAINT "unit_groups_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "units" DROP CONSTRAINT "units_groupId_fkey";

-- AlterTable
ALTER TABLE "artifact_sets" DROP COLUMN "artifactIds",
ALTER COLUMN "abilities" SET NOT NULL,
ALTER COLUMN "abilities" SET DEFAULT '[]';

-- AlterTable
ALTER TABLE "artifacts" DROP COLUMN "passiveAbility",
ALTER COLUMN "abilities" SET NOT NULL,
ALTER COLUMN "abilities" SET DEFAULT '[]';

-- AlterTable
ALTER TABLE "battle_scenes" DROP COLUMN "battleLog",
DROP COLUMN "initiativeOrder",
DROP COLUMN "pendingSummons";

-- AlterTable
ALTER TABLE "characters" DROP COLUMN "bonds",
DROP COLUMN "currentHp",
DROP COLUMN "flaws",
DROP COLUMN "hitDice",
DROP COLUMN "ideals",
DROP COLUMN "maxHp",
DROP COLUMN "passiveInsight",
DROP COLUMN "passiveInvestigation",
DROP COLUMN "passivePerception",
DROP COLUMN "personalityTraits",
DROP COLUMN "proficiencyBonus",
DROP COLUMN "spellAttackBonus",
DROP COLUMN "spellSaveDC",
DROP COLUMN "spellcastingClass",
DROP COLUMN "tempHp";

-- AlterTable
ALTER TABLE "races" ALTER COLUMN "abilities" SET NOT NULL,
ALTER COLUMN "abilities" SET DEFAULT '[]';

-- AlterTable
ALTER TABLE "skills" DROP COLUMN "armor",
DROP COLUMN "basicInfo",
DROP COLUMN "bonuses",
DROP COLUMN "combatStats",
DROP COLUMN "damage",
DROP COLUMN "magicalResistance",
DROP COLUMN "mainSkillData",
DROP COLUMN "physicalResistance",
DROP COLUMN "skillTriggers",
DROP COLUMN "speed",
DROP COLUMN "spellData",
ALTER COLUMN "abilities" SET NOT NULL,
ALTER COLUMN "abilities" SET DEFAULT '[]';

-- AlterTable
ALTER TABLE "units" DROP COLUMN "damageModifier",
DROP COLUMN "groupColor",
DROP COLUMN "groupId",
DROP COLUMN "race",
DROP COLUMN "specialAbilities",
ALTER COLUMN "abilities" SET NOT NULL,
ALTER COLUMN "abilities" SET DEFAULT '[]';

-- DropTable
DROP TABLE "racial_abilities";

-- DropTable
DROP TABLE "unit_groups";

