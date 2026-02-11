-- AlterTable: add per-character scaling coefficients (hp, melee damage, ranged damage)
ALTER TABLE "characters" ADD COLUMN "hpMultiplier" DOUBLE PRECISION;
ALTER TABLE "characters" ADD COLUMN "meleeMultiplier" DOUBLE PRECISION;
ALTER TABLE "characters" ADD COLUMN "rangedMultiplier" DOUBLE PRECISION;
