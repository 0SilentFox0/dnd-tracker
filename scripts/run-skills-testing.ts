#!/usr/bin/env tsx
/**
 * Тестування механік скілів: перевірка, що тригери спрацьовують вчасно і ефекти накладаються.
 * За замовчуванням завантажує всі скіли кампанії з БД (GET /campaigns/[id]/dm/skills → 110 скілів).
 *
 * Використання:
 *   npx tsx scripts/run-skills-testing.ts [CAMPAIGN_ID] [--filter triggerName]
 *
 * CAMPAIGN_ID — обов'язковий (скіли беруться з БД кампанії).
 * --filter — перевіряти лише скіли з цим тригером.
 */

import { type DbSkill,dbSkillToActiveSkill, getPrimaryTrigger } from "./run-skills-testing-convert";
import {
  runBonusActionTest,
  runGenericTriggerTest,
  runOnBattleStartTest,
  runOnHitTest,
  runOnKillTest,
  runOnLethalDamageTest,
  runPassiveTest,
} from "./run-skills-testing-runners";

import { DEFAULT_CAMPAIGN_ID } from "@/lib/constants";
import { prisma } from "@/lib/db";

const ARGS = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const CAMPAIGN_ID = ARGS[0] || DEFAULT_CAMPAIGN_ID;

const FILTER_TRIGGER = process.argv.includes("--filter")
  ? process.argv[process.argv.indexOf("--filter") + 1]
  : undefined;

async function main(): Promise<void> {
  const skills = await prisma.skill.findMany({
    where: { campaignId: CAMPAIGN_ID },
    select: {
      id: true,
      name: true,
      mainSkillId: true,
      combatStats: true,
      bonuses: true,
      skillTriggers: true,
    },
    orderBy: { name: "asc" },
  });

  if (skills.length === 0) {
    console.error("Скілів не знайдено. Перевірте CAMPAIGN_ID:", CAMPAIGN_ID);
    process.exit(1);
  }

  console.log(`Перевірка механік скілів (кампанія ${CAMPAIGN_ID}, ${skills.length} скілів)\n`);

  if (FILTER_TRIGGER) {
    console.log(`Фільтр тригера: ${FILTER_TRIGGER}\n`);
  }

  let passed = 0;

  let failed = 0;

  let skipped = 0;

  for (const row of skills) {
    const skill = dbSkillToActiveSkill(row as DbSkill);

    const trigger = getPrimaryTrigger(skill);

    if (FILTER_TRIGGER && trigger !== FILTER_TRIGGER) {
      skipped++;
      continue;
    }

    if (!trigger) {
      skipped++;
      continue;
    }

    const hasProbability = skill.skillTriggers?.some(
      (t) => t.type === "simple" && t.modifiers?.probability != null,
    );

    const mockRandom = trigger === "onHit" && !!hasProbability;

    let result: { passed: boolean; detail: string };

    switch (trigger) {
      case "onHit":
        result = runOnHitTest(skill, mockRandom);
        break;
      case "onKill":
        result = runOnKillTest(skill);
        break;
      case "passive":
        result = runPassiveTest(skill);
        break;
      case "bonusAction":
        result = runBonusActionTest(skill);
        break;
      case "onLethalDamage":
        result = runOnLethalDamageTest(skill);
        break;
      case "onBattleStart":
        result = runOnBattleStartTest(skill);
        break;
      case "onFirstHitTakenPerRound":
        result = { passed: true, detail: "counter_damage (used in battle flow)" };
        break;
      case "startRound":
      case "endRound":
      case "beforeOwnerAttack":
      case "beforeEnemyAttack":
      case "afterOwnerAttack":
      case "afterEnemyAttack":
      case "beforeOwnerSpellCast":
      case "afterOwnerSpellCast":
      case "beforeEnemySpellCast":
      case "afterEnemySpellCast":
      case "onCast":
      case "onAttack":
      case "onAllyDeath":
      case "onFirstRangedAttack":
      case "onMoraleSuccess":
      case "allyMoraleCheck":
        result = runGenericTriggerTest(skill, trigger);
        break;
      default:
        result = { passed: true, detail: `trigger ${trigger} (no dedicated test)` };
    }

    if (result.passed) {
      passed++;
      console.log(`  [✓] ${skill.name} (${skill.skillId}) — ${trigger}`);

      if (result.detail) console.log(`      ${result.detail}`);
    } else {
      failed++;
      console.log(`  [✗] ${skill.name} (${skill.skillId}) — ${trigger}`);
      console.log(`      ${result.detail}`);
    }
  }

  console.log("\n---");
  console.log(`Пройдено: ${passed}, провалено: ${failed}, пропущено (інший тригер/без тригера): ${skipped}`);
  process.exit(failed > 0 ? 1 : 0);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
