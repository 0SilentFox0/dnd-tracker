/**
 * Передумови контрактної міграції (spec 2026-10-06-dedup §2): лише читання.
 * Ненульовий код виходу, якщо є рядки, які реліз 1 прочитав би інакше, ніж старий код.
 *
 *   pnpm check-contract                                  — .env.local
 *   pnpm check-contract --env .env.production-db.local   — prod
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

const args = process.argv.slice(2);

config({ path: args.includes("--env") ? args[args.indexOf("--env") + 1] : ".env.local" });

const prisma = new PrismaClient();

// той самий предикат, що в upgradeLegacyParticipant: немає resolvedAbilities або лишились поля до 3a
const legacySnapshot = (s: string) => `(
  jsonb_typeof(${s}->'battleData'->'resolvedAbilities') IS DISTINCT FROM 'array'
  OR ${s}->'battleData'->'activeSkills' IS NOT NULL
  OR ${s}->'battleData'->'racialAbilities' IS NOT NULL
  OR ${s}->'battleData'->'passiveAbilities' IS NOT NULL
  OR ${s}->'battleData'->'skillUsageCounts' IS NOT NULL
)`;

const nonEmpty = (col: string, empty: "{}" | "[]") => `(${col} IS NOT NULL AND ${col} <> 'null'::jsonb AND ${col} <> '${empty}'::jsonb)`;

const CHECKS: Array<{ name: string; sql: string; requires?: { table: string; column: string } }> = [
  {
    name: "1. skills: abilities NULL при непорожніх combatStats/bonuses/skillTriggers",
    sql: `SELECT count(*) FROM skills WHERE abilities IS NULL AND (${nonEmpty(`"combatStats"`, "{}")} OR ${nonEmpty("bonuses", "{}")} OR ${nonEmpty(`"skillTriggers"`, "[]")})`,
  },
  {
    name: "1. races: abilities NULL при непорожньому passiveAbility",
    sql: `SELECT count(*) FROM races WHERE abilities IS NULL AND ${nonEmpty(`"passiveAbility"`, "{}")}`,
  },
  {
    // bonuses/modifiers лишаються статами зброї, але конвертер брав із них і вміння
    name: "1. artifacts: abilities NULL при непорожніх bonuses/modifiers/passiveAbility",
    sql: `SELECT count(*) FROM artifacts WHERE abilities IS NULL AND (${nonEmpty("bonuses", "{}")} OR ${nonEmpty("modifiers", "[]")} OR ${nonEmpty(`"passiveAbility"`, "{}")})`,
  },
  {
    name: "1. artifact_sets: abilities NULL при непорожньому setBonus",
    sql: `SELECT count(*) FROM artifact_sets WHERE abilities IS NULL AND ${nonEmpty(`"setBonus"`, "{}")}`,
  },
  {
    name: "1. units: abilities NULL при непорожніх specialAbilities",
    sql: `SELECT count(*) FROM units WHERE abilities IS NULL AND ${nonEmpty(`"specialAbilities"`, "[]")}`,
  },
  {
    name: "2. battle_participants: snapshot/state до 3a",
    sql: `SELECT count(*) FROM battle_participants WHERE ${legacySnapshot("snapshot")} OR state->'skillUsageCounts' IS NOT NULL`,
  },
  {
    name: "2. battle_snapshots: учасники/snapshot до 3a",
    sql: `SELECT count(*) FROM battle_snapshots s WHERE
      EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(s.state->'participants', '[]'::jsonb)) p WHERE p->'state'->'skillUsageCounts' IS NOT NULL)
      OR EXISTS (SELECT 1 FROM jsonb_each(COALESCE(s.state->'changedSnapshots', '{}'::jsonb)) c WHERE ${legacySnapshot("c.value")})
      OR EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(s.state->'removed', '[]'::jsonb)) r WHERE ${legacySnapshot("r->'snapshot'")} OR r->'state'->'skillUsageCounts' IS NOT NULL)`,
  },
  {
    name: "3. skills: basicInfo/spellData/mainSkillData не збігаються з пласкими колонками",
    sql: `SELECT count(*) FROM skills WHERE
      (COALESCE("basicInfo"->>'name', '') <> '' AND "basicInfo"->>'name' <> name)
      OR ("basicInfo" ? 'description' AND COALESCE("basicInfo"->>'description', '') <> COALESCE(description, ''))
      OR ("basicInfo" ? 'icon' AND COALESCE("basicInfo"->>'icon', '') <> COALESCE(icon, ''))
      OR ("spellId" IS NULL AND COALESCE("spellData"->>'spellId', '') <> '')
      OR ("spellGroupId" IS NULL AND COALESCE("spellData"->>'spellGroupId', '') <> '')
      OR ("grantedSpellId" IS NULL AND COALESCE("spellData"->>'grantedSpellId', '') <> '')
      OR (COALESCE("mainSkillData"->>'mainSkillId', '') <> '' AND "mainSkillData"->>'mainSkillId' IS DISTINCT FROM "mainSkillId")`,
  },
  {
    name: "§7.1 units: раса/група задана, raceId порожній (рознести на сторінці юнітів)",
    sql: `SELECT count(*) FROM units WHERE "raceId" IS NULL AND (race IS NOT NULL OR "groupId" IS NOT NULL)`,
    requires: { table: "units", column: "raceId" },
  },
];

async function hasColumn(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<unknown[]>`SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}`;

  return rows.length > 0;
}

async function main() {
  let failed = 0;

  for (const c of CHECKS) {
    if (c.requires && !(await hasColumn(c.requires.table, c.requires.column))) {
      console.info(`⏭  ${c.name}: пропущено (немає ${c.requires.table}.${c.requires.column})`);
      continue;
    }

    const [row] = await prisma.$queryRawUnsafe<{ count: bigint }[]>(c.sql);

    const n = Number(row.count);

    if (n > 0) failed++;

    console.info(`${n === 0 ? "✅" : "❌"} ${c.name}: ${n}`);
  }

  console.info(failed === 0 ? "\nПередумови виконано" : `\nНе виконано: ${failed}`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
