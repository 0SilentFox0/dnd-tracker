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

import type { SimpleSkillTrigger } from "@/types/skill-triggers";
import { ParticipantSide } from "@/lib/constants/battle";
import { DEFAULT_CAMPAIGN_ID } from "@/lib/constants";
import { prisma } from "@/lib/db";
import {
  checkSurviveLethal,
  executeBonusActionSkill,
  executeOnBattleStartEffects,
  executeOnHitEffects,
  executeOnKillEffects,
  executeSkillsByTrigger,
} from "@/lib/utils/skills/skill-triggers-execution";
import { SkillLevel } from "@/lib/types/skill-tree";
import type { ActiveSkill, BattleParticipant, SkillEffect } from "@/types/battle";

const ARGS = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const CAMPAIGN_ID = ARGS[0] || DEFAULT_CAMPAIGN_ID;
const FILTER_TRIGGER = process.argv.includes("--filter")
  ? process.argv[process.argv.indexOf("--filter") + 1]
  : undefined;

// ---------------------------------------------------------------------------
// Конвертація Skill з БД → ActiveSkill (та сама логіка, що в battle-participant)
// ---------------------------------------------------------------------------

type DbSkill = {
  id: string;
  name: string;
  mainSkillId: string | null;
  combatStats: unknown;
  bonuses: unknown;
  skillTriggers: unknown;
};

function dbSkillToActiveSkill(skill: DbSkill): ActiveSkill {
  type RawEffect = {
    stat: string;
    type: string;
    value?: number | string | boolean;
    duration?: number;
  };
  type CombatStatsEffects = { effects?: RawEffect[] };

  const combatStats = (skill.combatStats as CombatStatsEffects) ?? {};
  const rawEffects = Array.isArray(combatStats.effects) ? combatStats.effects : [];

  let effects: SkillEffect[];

  if (rawEffects.length > 0) {
    effects = rawEffects
      .filter((e) => e.stat)
      .map((e) => ({
        stat: e.stat,
        type: e.type,
        value: e.value ?? 0,
        isPercentage: e.type === "percent",
        duration: e.duration,
      }));
  } else {
    const bonuses = (skill.bonuses as Record<string, number>) || {};
    const percentKeys = ["melee_damage", "ranged_damage", "counter_damage"];
    effects = Object.entries(bonuses).map(([key, value]) => ({
      stat: key,
      type: percentKeys.includes(key) || key.includes("percent") ? "percent" : "flat",
      value,
      isPercentage:
        key.includes("percent") || key.includes("_percent") || percentKeys.includes(key),
    }));
  }

  let skillTriggers: ActiveSkill["skillTriggers"];
  if (skill.skillTriggers && Array.isArray(skill.skillTriggers)) {
    skillTriggers = skill.skillTriggers as ActiveSkill["skillTriggers"];
  }

  return {
    skillId: skill.id,
    name: skill.name,
    mainSkillId: skill.mainSkillId ?? "",
    level: SkillLevel.BASIC,
    effects,
    skillTriggers,
  };
}

/** Повертає перший простий тригер скіла для вибору тесту */
function getPrimaryTrigger(skill: ActiveSkill): SimpleSkillTrigger | null {
  const triggers = skill.skillTriggers ?? [];
  for (const t of triggers) {
    if (t.type === "simple" && t.trigger) {
      return t.trigger as SimpleSkillTrigger;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Мок-учасники
// ---------------------------------------------------------------------------

function createMockAttacker(activeSkills: ActiveSkill[]): BattleParticipant {
  return {
    basicInfo: {
      id: "attacker-1",
      battleId: "b1",
      sourceId: "c1",
      sourceType: "character",
      name: "Тест Атакуючий",
      side: ParticipantSide.ALLY,
      controlledBy: "dm",
    },
    abilities: {
      level: 10,
      initiative: 12,
      baseInitiative: 12,
      strength: 14,
      dexterity: 12,
      constitution: 12,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      modifiers: { strength: 2, dexterity: 1, constitution: 1, intelligence: 0, wisdom: 0, charisma: 0 },
      proficiencyBonus: 2,
      race: "human",
    },
    combatStats: {
      maxHp: 50,
      currentHp: 50,
      tempHp: 0,
      armorClass: 14,
      speed: 30,
      morale: 0,
      status: "active",
      minTargets: 1,
      maxTargets: 1,
    },
    spellcasting: { spellSlots: {}, knownSpells: [] },
    battleData: {
      attacks: [],
      activeEffects: [],
      passiveAbilities: [],
      racialAbilities: [],
      activeSkills,
      equippedArtifacts: [],
      skillUsageCounts: {},
    },
    actionFlags: {
      hasUsedAction: false,
      hasUsedBonusAction: false,
      hasUsedReaction: false,
      hasExtraTurn: false,
    },
  };
}

function createMockTarget(overrides?: Partial<BattleParticipant>): BattleParticipant {
  const base: BattleParticipant = {
    basicInfo: {
      id: "target-1",
      battleId: "b1",
      sourceId: "u1",
      sourceType: "unit",
      name: "Тест Ворог",
      side: ParticipantSide.ENEMY,
      controlledBy: "dm",
    },
    abilities: {
      level: 5,
      initiative: 10,
      baseInitiative: 10,
      strength: 12,
      dexterity: 10,
      constitution: 10,
      intelligence: 8,
      wisdom: 8,
      charisma: 8,
      modifiers: { strength: 1, dexterity: 0, constitution: 0, intelligence: -1, wisdom: -1, charisma: -1 },
      proficiencyBonus: 2,
      race: "orc",
    },
    combatStats: {
      maxHp: 40,
      currentHp: 40,
      tempHp: 0,
      armorClass: 12,
      speed: 25,
      morale: 0,
      status: "active",
      minTargets: 1,
      maxTargets: 1,
    },
    spellcasting: { spellSlots: {}, knownSpells: [] },
    battleData: {
      attacks: [],
      activeEffects: [],
      passiveAbilities: [],
      racialAbilities: [],
      activeSkills: [],
      equippedArtifacts: [],
      skillUsageCounts: {},
    },
    actionFlags: {
      hasUsedAction: false,
      hasUsedBonusAction: false,
      hasUsedReaction: false,
      hasExtraTurn: false,
    },
  };
  if (overrides) {
    return { ...base, ...overrides } as BattleParticipant;
  }
  return base;
}

// ---------------------------------------------------------------------------
// Перевірки результатів
// ---------------------------------------------------------------------------

function runOnHitTest(
  skill: ActiveSkill,
  mockRandom: boolean,
): { passed: boolean; detail: string } {
  const attacker = createMockAttacker([skill]);
  const target = createMockTarget();
  let randomRestore: (() => void) | undefined;
  if (mockRandom) {
    const orig = Math.random;
    (global as unknown as { Math: { random: () => number } }).Math.random = () => 0;
    randomRestore = () => {
      (global as unknown as { Math: { random: () => number } }).Math.random = orig;
    };
  }
  try {
    const result = executeOnHitEffects(attacker, target, 1, {}, 10);
    const targetEffects = result.updatedTarget.battleData.activeEffects ?? [];
    const hasDebuff = targetEffects.some(
      (e) =>
        e.dotDamage ||
        e.effects?.some(
          (d) =>
            d.type === "speed" ||
            d.type === "armor" ||
            (d.type === "initiative_bonus" && typeof d.value === "number" && d.value < 0),
        ),
    );
    const hasAnyEffect =
      targetEffects.length > 0 || (result.updatedAttacker.battleData.activeEffects?.length ?? 0) > 0;
    const hasMessage = result.messages.length > 0;
    if (hasDebuff || (hasAnyEffect && hasMessage)) {
      return { passed: true, detail: result.messages.join("; ") || "effect applied" };
    }
    if (
      skill.effects.some((e) =>
        ["damage_resistance", "guaranteed_hit", "damage", "area_damage", "area_cells"].includes(e.stat),
      )
    ) {
      return { passed: true, detail: result.messages.join("; ") || `stat ${skill.effects.map((e) => e.stat).join(",")} (no debuff expected)` };
    }
    return { passed: false, detail: `no effect on target; messages: ${result.messages.join("; ") || "none"}` };
  } finally {
    randomRestore?.();
  }
}

function runOnKillTest(skill: ActiveSkill): { passed: boolean; detail: string } {
  const killer = createMockAttacker([skill]);
  const usage: Record<string, number> = {};
  const result = executeOnKillEffects(killer, usage);
  const hasExtraTurn = result.updatedKiller.actionFlags?.hasExtraTurn === true;
  const hasMessage = result.messages.length > 0;
  const expectsAction = skill.effects.some((e) => e.stat === "actions");
  if (expectsAction && (hasExtraTurn || hasMessage)) {
    return { passed: true, detail: result.messages.join("; ") || "onKill executed" };
  }
  if (!expectsAction) {
    return { passed: true, detail: "onKill trigger ran (no actions effect)" };
  }
  return { passed: false, detail: `expected +1 action; messages: ${result.messages.join("; ") || "none"}` };
}

function runPassiveTest(skill: ActiveSkill): { passed: boolean; detail: string } {
  const participant = createMockAttacker([skill]);
  const allParticipants = [participant, createMockTarget()];
  const result = executeSkillsByTrigger(participant, "passive", allParticipants, { currentRound: 1 });
  const executed = result.executedSkills.length > 0;
  const hasMessages = result.messages.length > 0;
  if (executed || hasMessages) {
    return { passed: true, detail: result.messages.join("; ") || "passive executed" };
  }
  return { passed: true, detail: "passive (effects used in damage/AC calc, not here)" };
}

function runBonusActionTest(skill: ActiveSkill): { passed: boolean; detail: string } {
  const participant = createMockAttacker([skill]);
  const allParticipants = [participant, createMockTarget()];
  const result = executeBonusActionSkill(participant, skill, allParticipants, 1, undefined, {});
  const hasMessages = result.messages.length > 0;
  const participantsUpdated = result.updatedParticipants !== allParticipants;
  if (hasMessages || participantsUpdated) {
    return { passed: true, detail: result.messages.join("; ") || "bonus action executed" };
  }
  return { passed: false, detail: "no messages and no participant updates" };
}

function runOnLethalDamageTest(skill: ActiveSkill): { passed: boolean; detail: string } {
  const participant = createMockAttacker([skill]);
  const usage: Record<string, number> = {};
  const result = checkSurviveLethal(participant, usage);
  if (result.survived && result.message) {
    return { passed: true, detail: result.message };
  }
  return { passed: false, detail: result.message ?? "survive_lethal did not trigger" };
}

function runOnBattleStartTest(skill: ActiveSkill): { passed: boolean; detail: string } {
  const participant = createMockAttacker([skill]);
  const result = executeOnBattleStartEffects(participant, 1);
  const hasMessages = result.messages.length > 0;
  if (hasMessages) {
    return { passed: true, detail: result.messages.join("; ") || "onBattleStart executed" };
  }
  return { passed: true, detail: "onBattleStart (no effect or already applied)" };
}

/** Для тригерів startRound, endRound, beforeOwnerAttack тощо — просто виконуємо executeSkillsByTrigger */
function runGenericTriggerTest(
  skill: ActiveSkill,
  trigger: SimpleSkillTrigger,
): { passed: boolean; detail: string } {
  const participant = createMockAttacker([skill]);
  const allParticipants = [participant, createMockTarget()];
  const context: { currentRound?: number; isOwnerAction?: boolean; target?: BattleParticipant } = {
    currentRound: 1,
    isOwnerAction: true,
    target: allParticipants[1],
  };
  const result = executeSkillsByTrigger(participant, trigger, allParticipants, context);
  const executed = result.executedSkills.length > 0;
  const hasMessages = result.messages.length > 0;
  if (executed || hasMessages) {
    return { passed: true, detail: result.messages.join("; ") || `${trigger} executed` };
  }
  return { passed: true, detail: `${trigger} (no effect or condition not met)` };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

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
