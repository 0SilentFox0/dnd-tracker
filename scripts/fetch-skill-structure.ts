/**
 * Тестовий скрипт: вивести структуру скіла з БД (зокрема combatStats, affectsDamage).
 * Запуск: npx tsx scripts/fetch-skill-structure.ts [skillId]
 * За замовчуванням skillId = cml9zkhry000zugrfb2aaqc98
 */

import { prisma } from "../lib/db";

const SKILL_ID = process.argv[2] ?? "cml9zkhry000zugrfb2aaqc98";

async function main() {
  const skill = await prisma.skill.findUnique({
    where: { id: SKILL_ID },
  });

  if (!skill) {
    console.log("Скіл не знайдено:", SKILL_ID);
    process.exit(1);
  }

  console.log("=== Скіл (raw Prisma) ===");
  console.log("id:", skill.id);
  console.log("name:", skill.name);
  console.log("campaignId:", skill.campaignId);
  console.log("combatStats (JSON):", JSON.stringify(skill.combatStats, null, 2));
  console.log("\n=== combatStats.affectsDamage ===", (skill.combatStats as Record<string, unknown>)?.affectsDamage);
  console.log("=== combatStats.damageType ===", (skill.combatStats as Record<string, unknown>)?.damageType);
  console.log("=== combatStats.effects ===", (skill.combatStats as Record<string, unknown>)?.effects);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
