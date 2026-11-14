-- E4 S.6 contract: NOT APPLIED. DRAFT kept outside prisma/migrations on purpose.
-- Requires: a separate earlier deploy "stop writing columns", fresh backup (scripts/db/backup-database.sh),
-- `--report --expect-zero` on prod, and a separate explicit user approval. See README.md.
-- After DROP only a backup restores the data; a Vercel rollback does not revert the schema.
-- To apply: copy to prisma/migrations/<timestamp>_drop_d20_statblock_columns/migration.sql together with schema.patch.
-- No CREATE TABLE here, so no RLS statement is needed.

ALTER TABLE "characters"
    DROP COLUMN IF EXISTS "strength",
    DROP COLUMN IF EXISTS "dexterity",
    DROP COLUMN IF EXISTS "constitution",
    DROP COLUMN IF EXISTS "intelligence",
    DROP COLUMN IF EXISTS "wisdom",
    DROP COLUMN IF EXISTS "charisma",
    DROP COLUMN IF EXISTS "armorClass",
    DROP COLUMN IF EXISTS "initiative",
    DROP COLUMN IF EXISTS "speed";

ALTER TABLE "units"
    DROP COLUMN IF EXISTS "strength",
    DROP COLUMN IF EXISTS "dexterity",
    DROP COLUMN IF EXISTS "constitution",
    DROP COLUMN IF EXISTS "intelligence",
    DROP COLUMN IF EXISTS "wisdom",
    DROP COLUMN IF EXISTS "charisma",
    DROP COLUMN IF EXISTS "armorClass",
    DROP COLUMN IF EXISTS "initiative",
    DROP COLUMN IF EXISTS "speed";

ALTER TABLE "units_base"
    DROP COLUMN IF EXISTS "strength",
    DROP COLUMN IF EXISTS "dexterity",
    DROP COLUMN IF EXISTS "constitution",
    DROP COLUMN IF EXISTS "intelligence",
    DROP COLUMN IF EXISTS "wisdom",
    DROP COLUMN IF EXISTS "charisma",
    DROP COLUMN IF EXISTS "armorClass",
    DROP COLUMN IF EXISTS "initiative",
    DROP COLUMN IF EXISTS "speed";
