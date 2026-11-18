-- Wave 4 contract (M2): module values live in ext.* / skill_tree_progress / battle slot since D2.
-- Readers removed in the D2 deploy; backfills confirmed with --report --expect-zero. Back up first.
ALTER TABLE "battle_scenes" DROP COLUMN "pendingMoraleCheck";
ALTER TABLE "characters" DROP COLUMN "inspiration";
ALTER TABLE "characters" DROP COLUMN "morale";
ALTER TABLE "characters" DROP COLUMN "skillTreeProgress";
ALTER TABLE "units" DROP COLUMN "morale";
ALTER TABLE "units_base" DROP COLUMN "morale";
