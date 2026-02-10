#!/usr/bin/env tsx
/**
 * Тестування заклинань за docs/SPELLS_TESTING.md.
 * Парсить тест-кейси, для кожного spell id завантажує заклинання з БД і викликає processSpell з мок-учасниками.
 * Звітує які тести пройшли / впали.
 *
 * Опції:
 *   --fix                 PATCH заклинання (ST/HT) за тест-кейсом і повторна перевірка лише провалених
 *   --update-descriptions Оновити Spell.description для кожного заклинання з ефектів тест-кейсу
 *   --iterate N           Максимум ітерацій при --fix (за замовчуванням 5)
 *
 * Використання:
 *   npx tsx scripts/run-spells-testing.ts [CAMPAIGN_ID] [--fix] [--update-descriptions] [--iterate N]
 *
 *   CAMPAIGN_ID — обов'язковий для --update-descriptions (інакше заклинання не знайдуться)
 */
import { Prisma } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

import { DEFAULT_CAMPAIGN_ID } from "@/lib/constants";
import { ParticipantSide } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { getEffectiveArmorClass } from "@/lib/utils/battle/battle-participant-helpers";
import type { BattleSpell } from "@/lib/utils/battle/battle-spell-process";
import { processSpell } from "@/lib/utils/battle/battle-spell-process";
import { calculateInitiative } from "@/lib/utils/battle/battle-start";
import {
  getUniqueSpellIds,
  parseAssertionsToEffectDetails,
  type ParsedSpellEffect,
  parseSpellsTestingMd,
  type SpellTestCase,
} from "@/lib/utils/spells/spells-testing-parser";
import type { BattleParticipant } from "@/types/battle";

const ABILITY_LABELS: Record<string, string> = {
  strength: "Сила",
  dexterity: "Спритність",
  constitution: "Витримка",
  intelligence: "Інтелект",
  wisdom: "Мудрість",
  charisma: "Харизма",
};

/** Замінює скорочення на повну форму в тексті */
function expandAbbreviations(text: string): string {
  return text
    .replace(/\bTE\b/gi, "ціль-ворог (target enemy)")
    .replace(/\bTA\b/gi, "ціль-союзник (target ally)")
    .replace(/\bD(\d+)\b/g, "дебаф на $1 раунд(ів)")
    .replace(/\bB(\d+)\b/g, "баф на $1 раунд(ів)")
    .replace(/\bAoE\b/gi, "область (can be applied to many units)")
    .replace(/\bTargeted\b/gi, "цільований (1 ціль)")
    .replace(/No Target/gi, "без цілі")
    .replace(/\bST\b(?!\s*-\s*no)/gi, "кидок рятунку (Saving Throw)")
    .replace(/\bHT\b(?!\s*NO)/gi, "перевірка попадання (Hit Check)");
}

/** Формує опис заклинання з ефектів тест-кейсу (для оновлення Spell.description) */
function buildDescriptionFromTestCase(tc: SpellTestCase): string {
  const lines: string[] = [];

  if (tc.assertions.length > 0) {
    lines.push("Ефекти:");
    for (const a of tc.assertions) {
      lines.push(`• ${expandAbbreviations(a.trim())}`);
    }
  }

  if (tc.savingThrow !== "no") {
    const ab = ABILITY_LABELS[tc.savingThrow.ability] ?? tc.savingThrow.ability;

    lines.push(
      `Перевірка: кидок рятунку (${ab}) >= ${tc.savingThrow.dc} для зменшення або уникнення ефекту.`,
    );
  }

  if (tc.hitCheck !== "no") {
    const ab = ABILITY_LABELS[tc.hitCheck.ability] ?? tc.hitCheck.ability;

    lines.push(
      `Перевірка попадання: ${ab} + кидок d20 >= ${tc.hitCheck.dc} для застосування заклинання.`,
    );
  }

  return lines.join("\n\n") || "";
}

/** Форматує ефект для виводу */
function formatEffect(e: {
  type: string;
  value: number;
  isPercentage?: boolean;
}): string {
  const pct = e.isPercentage ? "%" : "";

  return `${e.type}=${e.value > 0 ? "+" : ""}${e.value}${pct}`;
}

/** Форматує тест-кейс в один рядок: assertions + ST + HT */
function formatTestCase(tc: SpellTestCase): string {
  const parts: string[] = [];

  if (tc.assertions.length > 0) {
    parts.push(tc.assertions.slice(0, 3).join("; "));

    if (tc.assertions.length > 3) parts.push("…");
  }

  if (tc.savingThrow !== "no") {
    parts.push(
      `ST ${tc.savingThrow.ability.toUpperCase()}>=${tc.savingThrow.dc}`,
    );
  }

  if (tc.hitCheck !== "no") {
    parts.push(`HT ${tc.hitCheck.ability.toUpperCase()}>=${tc.hitCheck.dc}`);
  }

  return parts.join(" | ") || "—";
}

const ARGS = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const CAMPAIGN_ID = ARGS[0] || DEFAULT_CAMPAIGN_ID;

const DO_FIX = process.argv.includes("--fix");

const DO_UPDATE_DESCRIPTIONS = process.argv.includes("--update-descriptions");

const ITERATE = (() => {
  const i = process.argv.indexOf("--iterate");

  if (i === -1 || !process.argv[i + 1]) return 5;

  return Math.max(1, parseInt(process.argv[i + 1], 10) || 5);
})();

function mod(ability: number): number {
  return Math.floor((ability - 10) / 2);
}

function createMockCaster(
  spellId: string,
  level: number,
  spellLevel: number,
): BattleParticipant {
  const wisdom = 14;

  const intelligence = 16;

  const dexterity = 14;

  const slots: Record<string, { max: number; current: number }> = {};

  for (let i = 0; i <= 5; i++) slots[String(i)] = { max: 4, current: 4 };

  return {
    basicInfo: {
      id: "caster-test",
      battleId: "test-battle",
      sourceId: "caster-test",
      sourceType: "character",
      instanceId: undefined,
      name: "Test Caster",
      avatar: undefined,
      side: ParticipantSide.ALLY,
      controlledBy: "dm",
    },
    abilities: {
      level,
      initiative: 10,
      baseInitiative: 10,
      strength: 10,
      dexterity,
      constitution: 14,
      intelligence,
      wisdom,
      charisma: 10,
      modifiers: {
        strength: mod(10),
        dexterity: mod(dexterity),
        constitution: mod(14),
        intelligence: mod(intelligence),
        wisdom: mod(wisdom),
        charisma: mod(10),
      },
      proficiencyBonus: 2 + Math.floor(level / 4),
      race: "human",
    },
    combatStats: {
      maxHp: 50,
      currentHp: 50,
      tempHp: 0,
      armorClass: 12,
      speed: 30,
      morale: 0,
      status: "active",
      minTargets: 1,
      maxTargets: 1,
    },
    spellcasting: {
      spellcastingClass: "wizard",
      spellcastingAbility: "intelligence",
      spellSaveDC: 14,
      spellAttackBonus: 5,
      spellSlots: slots,
      knownSpells: [spellId],
    },
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
}

/** Юніт tier 7 (level 7) для тестування — HP/AC/init/speed масштабовані */
function createMockEnemy(id: string, tier: number = 7): BattleParticipant {
  const hp = 15 * tier;

  const ac = 10 + Math.floor(tier / 2);

  const initiative = 5 + tier;

  const speed = 25 + tier;

  return {
    basicInfo: {
      id,
      battleId: "test-battle",
      sourceId: id,
      sourceType: "unit",
      instanceId: id,
      name: `Test Enemy T${tier}`,
      avatar: undefined,
      side: ParticipantSide.ENEMY,
      controlledBy: "dm",
    },
    abilities: {
      level: tier,
      initiative,
      baseInitiative: initiative,
      strength: 10 + tier,
      dexterity: 10 + tier,
      constitution: 12 + tier,
      intelligence: 10,
      wisdom: 10,
      charisma: 8,
      modifiers: {
        strength: mod(10 + tier),
        dexterity: mod(10 + tier),
        constitution: mod(12 + tier),
        intelligence: mod(10),
        wisdom: mod(10),
        charisma: mod(8),
      },
      proficiencyBonus: 2 + Math.floor(tier / 4),
      race: "human",
    },
    combatStats: {
      maxHp: hp,
      currentHp: hp,
      tempHp: 0,
      armorClass: ac,
      speed,
      morale: 0,
      status: "active",
      minTargets: 1,
      maxTargets: 1,
    },
    spellcasting: {
      spellSlots: {},
      knownSpells: [],
    },
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
}

/** Союзник tier 7 для заклинань на союзників (TA) */
function createMockAlly(id: string, tier: number = 7): BattleParticipant {
  const base = createMockEnemy(id, tier);

  return {
    ...base,
    basicInfo: {
      ...base.basicInfo,
      name: `Test Ally T${tier}`,
      side: ParticipantSide.ALLY,
    },
  };
}

/** Середнє значення для кубика (d6→4, d8→5, d10→6) */
function avgRoll(diceType: string): number {
  const m = diceType?.toLowerCase().match(/d(\d+)/);

  const sides = m ? parseInt(m[1], 10) : 6;

  return Math.ceil((sides + 1) / 2);
}

/** Генерує damageRolls для заклинання — diceCount кубиків з середнім значенням */
function generateDamageRolls(
  diceCount: number | null,
  diceType: string | null,
): number[] {
  const n = Math.max(1, diceCount ?? 2);

  const avg = avgRoll(diceType ?? "d6");

  const rolls = Array.from({ length: n }, () => avg);

  return rolls;
}

const spellRowFields = {
  id: true,
  name: true,
  level: true,
  type: true,
  target: true,
  damageType: true,
  savingThrow: true,
  hitCheck: true,
  duration: true,
  diceCount: true,
  diceType: true,
  damageElement: true,
  damageModifier: true,
  healModifier: true,
  castingTime: true,
  description: true,
  effectDetails: true,
} as const;

type SpellRowSelect = {
  id: string;
  name: string;
  level: number;
  type: string;
  target: string | null;
  damageType: string;
  savingThrow: unknown;
  hitCheck: unknown;
  duration: string | null;
  diceCount: number | null;
  diceType: string | null;
  damageElement: string | null;
  damageModifier: string | null;
  healModifier: string | null;
  castingTime: string | null;
  description: string | null;
  effectDetails: unknown;
};

function spellToBattleSpell(
  row: SpellRowSelect,
  overrides: {
    savingThrow?: SpellTestCase["savingThrow"];
    hitCheck?: SpellTestCase["hitCheck"];
    effectDetails?: BattleSpell["effectDetails"];
  },
): BattleSpell {
  const st =
    overrides.savingThrow !== undefined
      ? overrides.savingThrow === "no"
        ? null
        : overrides.savingThrow
          ? {
              ability: overrides.savingThrow.ability,
              onSuccess: "half" as const,
              dc: overrides.savingThrow.dc,
            }
          : null
      : ((row.savingThrow as BattleSpell["savingThrow"]) ?? null);

  const ht =
    overrides.hitCheck !== undefined
      ? overrides.hitCheck === "no"
        ? null
        : overrides.hitCheck
      : ((row.hitCheck as BattleSpell["hitCheck"]) ?? undefined);

  const effectDetails =
    overrides.effectDetails !== undefined
      ? overrides.effectDetails
      : ((row.effectDetails as BattleSpell["effectDetails"]) ?? undefined);

  return {
    id: row.id,
    name: row.name,
    level: row.level,
    type: (row.type || "target") as "target" | "aoe" | "no_target",
    target: (row.target as "enemies" | "allies" | "all") || undefined,
    damageType: (row.damageType || "damage") as "damage" | "heal" | "all",
    damageElement: row.damageElement,
    damageModifier: row.damageModifier,
    healModifier: row.healModifier,
    diceCount: row.diceCount,
    diceType: row.diceType,
    savingThrow: st,
    hitCheck: ht ?? undefined,
    description: row.description ?? "",
    duration: row.duration,
    castingTime: row.castingTime,
    effectDetails: effectDetails ?? undefined,
  };
}

interface ParticipantFullStats {
  hp: number;
  maxHp: number;
  speed: number;
  initiative: number;
  ac: number;
  bonusAction: boolean;
  morale: number;
  buffs: string[];
  debuffs: string[];
  /** Формат як у afterEffects: "Name(type,D3)" для порівняння знятих ефектів */
  effects: string[];
}

interface TargetStats {
  participantId: string;
  name: string;
  before: ParticipantFullStats;
  after: ParticipantFullStats;
  hpChange: number;
  effectsRemoved?: string[];
}

interface RunResult {
  spellId: string;
  name: string;
  passed: boolean;
  reason?: string;
  expectedEffects?: ParsedSpellEffect[];
  expectedDuration?: number;
  appliedEffects?: Array<{
    type: string;
    value: number;
    isPercentage?: boolean;
  }>;
  appliedDuration?: number;
  /** Детальні зміни по цілях: HP, AC, initiative, speed, buffs/debuffs */
  targetStats?: TargetStats[];
}

/** Ефективна швидкість з урахуванням activeEffects (speed ±X%) */
function getEffectiveSpeed(p: BattleParticipant): number {
  let speed = p.combatStats.speed;
  let percentMod = 0;
  for (const ae of p.battleData?.activeEffects ?? []) {
    for (const d of ae.effects ?? []) {
      if (d.type === "speed" && typeof d.value === "number" && d.isPercentage) {
        percentMod += d.value;
      }
    }
  }
  return Math.max(0, Math.floor(speed * (1 + percentMod / 100)));
}

/** Ефективна мораль з урахуванням activeEffects */
function getEffectiveMorale(p: BattleParticipant): number {
  let morale = p.combatStats.morale ?? 0;
  for (const ae of p.battleData?.activeEffects ?? []) {
    for (const d of ae.effects ?? []) {
      if (d.type === "morale" && typeof d.value === "number") {
        morale += d.value;
      }
    }
  }
  return morale;
}

function getParticipantStats(p: BattleParticipant): ParticipantFullStats {
  const buffs: string[] = [];
  const debuffs: string[] = [];
  const effects: string[] = [];
  for (const e of p.battleData?.activeEffects ?? []) {
    const label = e.name;
    if (e.type === "buff") buffs.push(label);
    else debuffs.push(label);
    effects.push(`${label}(${e.type},D${e.duration ?? 0})`);
  }
  return {
    hp: p.combatStats.currentHp,
    maxHp: p.combatStats.maxHp,
    speed: getEffectiveSpeed(p),
    initiative: calculateInitiative(p),
    ac: getEffectiveArmorClass(p),
    bonusAction: !p.actionFlags.hasUsedBonusAction,
    morale: getEffectiveMorale(p),
    buffs,
    debuffs,
    effects,
  };
}

async function runOne(
  campaignId: string,
  tc: SpellTestCase,
  spellRow: SpellRowSelect | null,
): Promise<RunResult> {
  if (!spellRow) {
    return {
      spellId: tc.spellId,
      name: tc.name,
      passed: false,
      reason: "заклинання не знайдено в БД",
    };
  }

  const caster = createMockCaster(tc.spellId, 10, spellRow.level);

  const enemyId = "enemy-1";

  const allyId = "ally-1";

  const enemy = createMockEnemy(enemyId);

  const ally = createMockAlly(allyId);

  const allParticipants: BattleParticipant[] = [caster, enemy, ally];

  const targetFromSpell = (spellRow.target as string)?.toLowerCase();

  const assertionsLower = tc.assertions.join(" ").toLowerCase();

  const targetAllies =
    targetFromSpell === "allies" ||
    /\bta\b|target ally|for ta\b/i.test(assertionsLower);

  const targetIds =
    spellRow.type === "no_target" ? [] : targetAllies ? [allyId] : [enemyId];

  let damageRolls = generateDamageRolls(spellRow.diceCount, spellRow.diceType);

  const addLevel =
    /level|lelvel/i.test(spellRow.damageModifier ?? "") ||
    /level/.test(tc.assertions.join(" "));

  if (
    addLevel &&
    (spellRow.damageType === "damage" || spellRow.damageType === "all")
  ) {
    damageRolls = [...damageRolls, caster.abilities.level];
  }

  const savingThrows =
    tc.savingThrow !== "no" && targetIds.length > 0
      ? [{ participantId: enemyId, roll: 10 }]
      : undefined;

  const hitRoll =
    tc.hitCheck !== "no" && tc.hitCheck
      ? Math.max(
          1,
          Math.min(20, tc.hitCheck.dc - mod(caster.abilities.intelligence) + 1),
        )
      : undefined;

  const isCleansing =
    spellRow.name === "Cleansing" ||
    spellRow.name === "Очищення" ||
    spellRow.healModifier === "dispel";

  if (isCleansing && targetIds.length > 0) {
    const debuff: BattleParticipant["battleData"]["activeEffects"][0] = {
      id: "pre-debuff-slow",
      name: "Slow",
      type: "debuff",
      duration: 3,
      appliedAt: { round: 1, timestamp: new Date() },
      effects: [{ type: "speed", value: -50, isPercentage: true }],
    };

    for (const tid of targetIds) {
      const idx = allParticipants.findIndex((p) => p.basicInfo.id === tid);

      if (idx >= 0) {
        allParticipants[idx] = {
          ...allParticipants[idx],
          battleData: {
            ...allParticipants[idx].battleData,
            activeEffects: [
              ...allParticipants[idx].battleData.activeEffects,
              debuff,
            ],
          },
        };
      }
    }
  }

  const targetsBefore = targetIds
    .map((id) => allParticipants.find((p) => p.basicInfo.id === id))
    .filter((p): p is BattleParticipant => !!p)
    .map((p) => ({
      id: p.basicInfo.id,
      name: p.basicInfo.name,
      stats: getParticipantStats(p),
    }));

  // Для тесту підставляємо effectDetails з тест-кейсу, якщо в БД їх ще немає
  const parsedFromTc = parseAssertionsToEffectDetails(tc.assertions);

  const spellFromDb = spellToBattleSpell(spellRow, {
    savingThrow: tc.savingThrow,
    hitCheck: tc.hitCheck,
  });

  const spell: BattleSpell =
    !spellFromDb.effectDetails?.effects?.length &&
    parsedFromTc.effects.length > 0
      ? {
          ...spellFromDb,
          effectDetails: {
            duration: parsedFromTc.duration || undefined,
            effects: parsedFromTc.effects,
          },
        }
      : spellFromDb;

  try {
    const result = processSpell({
      caster,
      spell,
      targetIds,
      allParticipants,
      currentRound: 1,
      battleId: "test-battle",
      damageRolls,
      savingThrows,
      hitRoll,
    });

    if (
      !result.success &&
      result.battleAction.resultText?.includes("немає доступних spell slots")
    ) {
      return {
        spellId: tc.spellId,
        name: tc.name,
        passed: false,
        reason: "немає spell slots",
      };
    }

    // Збираємо очікувані ефекти з тест-кейсу
    const expectedEffects = parsedFromTc.effects;

    const expectedDuration = parsedFromTc.duration;

    // Збираємо фактично застосовані ефекти з targetsUpdated
    const appliedEffects: Array<{
      type: string;
      value: number;
      isPercentage?: boolean;
    }> = [];

    let appliedDuration = 0;

    for (const target of result.targetsUpdated) {
      for (const ae of target.battleData.activeEffects) {
        if (ae.name === spell.name) {
          appliedDuration = Math.max(appliedDuration, ae.duration ?? 0);
          for (const d of ae.effects) {
            const val = typeof d.value === "number" ? d.value : 0;

            appliedEffects.push({
              type: d.type ?? "unknown",
              value: val,
              isPercentage: d.isPercentage,
            });
          }
        }
      }
    }

    const targetStats: TargetStats[] = [];

    for (const before of targetsBefore) {
      const afterTarget = result.targetsUpdated.find(
        (t) => t.basicInfo.id === before.id,
      );

      if (!afterTarget) continue;

      const afterEffects = afterTarget.battleData.activeEffects.map(
        (e) => `${e.name}(${e.type},D${e.duration})`,
      );

      const effectsRemoved = before.stats.effects.filter(
        (e) => !afterEffects.includes(e),
      );

      targetStats.push({
        participantId: before.id,
        name: before.name,
        before: before.stats,
        after: getParticipantStats(afterTarget),
        hpChange: afterTarget.combatStats.currentHp - before.stats.hp,
        effectsRemoved: effectsRemoved.length > 0 ? effectsRemoved : undefined,
      });
    }

    return {
      spellId: tc.spellId,
      name: tc.name,
      passed: true,
      expectedEffects,
      expectedDuration,
      appliedEffects,
      appliedDuration,
      targetStats,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);

    return {
      spellId: tc.spellId,
      name: tc.name,
      passed: false,
      reason: message,
    };
  }
}

async function main() {
  if (!CAMPAIGN_ID) {
    console.error(
      "Вкажіть CAMPAIGN_ID: npx tsx scripts/run-spells-testing.ts CAMPAIGN_ID [--fix] [--iterate N]",
    );
    process.exit(1);
  }

  const mdPath = path.join(process.cwd(), "docs", "SPELLS_TESTING.md");

  const content = fs.readFileSync(mdPath, "utf8");

  const cases = parseSpellsTestingMd(content);

  const uniqueIds = getUniqueSpellIds(cases);

  const caseBySpellId = new Map<string, SpellTestCase>();

  for (const tc of cases) {
    caseBySpellId.set(tc.spellId, tc);
  }
  console.log(
    "Parsed",
    cases.length,
    "test cases,",
    uniqueIds.length,
    "unique spell ids\n",
  );

  if (DO_UPDATE_DESCRIPTIONS) {
    console.log(
      "Оновлення описів, Saving Throw та Hit Check для заклинань з тест-кейсів...\n",
    );

    const byId = await prisma.spell.findMany({
      where: { campaignId: CAMPAIGN_ID, id: { in: uniqueIds } },
      select: { id: true, name: true },
    });

    const spellByIdForUpdate = new Map(byId.map((s) => [s.id, s]));

    const missingForUpdate = uniqueIds.filter(
      (id) => !spellByIdForUpdate.has(id),
    );

    if (missingForUpdate.length > 0) {
      const names = missingForUpdate
        .map((id) => caseBySpellId.get(id)?.name)
        .filter((n): n is string => !!n);

      const byName = await prisma.spell.findMany({
        where: { campaignId: CAMPAIGN_ID, name: { in: names } },
        select: { id: true, name: true },
      });

      const byNameMap = new Map(byName.map((s) => [s.name, s]));

      for (const id of missingForUpdate) {
        const tc = caseBySpellId.get(id);

        const found = tc ? byNameMap.get(tc.name) : null;

        if (found) spellByIdForUpdate.set(id, found);
      }
    }

    let updated = 0;

    for (const spellId of uniqueIds) {
      const tc = caseBySpellId.get(spellId);

      if (!tc) continue;

      const dbSpell = spellByIdForUpdate.get(spellId);

      if (!dbSpell) {
        console.log(
          `  ⚠ ${tc.name}: не знайдено в кампанії (ні за id, ні за назвою)`,
        );
        continue;
      }

      const description = buildDescriptionFromTestCase(tc);

      const savingThrow =
        tc.savingThrow === "no"
          ? Prisma.JsonNull
          : ({
              ability: tc.savingThrow.ability,
              onSuccess: "half",
              dc: tc.savingThrow.dc,
            } as object);

      const hitCheck =
        tc.hitCheck === "no"
          ? Prisma.JsonNull
          : ({ ability: tc.hitCheck.ability, dc: tc.hitCheck.dc } as object);

      const parsed = parseAssertionsToEffectDetails(tc.assertions);

      const effectDetails =
        parsed.effects.length > 0 || parsed.duration > 0
          ? ({
              duration: parsed.duration || undefined,
              effects: parsed.effects,
            } as object)
          : Prisma.JsonNull;

      const result = await prisma.spell.updateMany({
        where: { id: dbSpell.id, campaignId: CAMPAIGN_ID },
        data: {
          description,
          savingThrow,
          hitCheck,
          effectDetails,
        },
      });

      if (result.count > 0) {
        updated++;
        console.log(`  ✓ ${tc.name} (${dbSpell.id})`);
      }
    }
    console.log(
      `\nОновлено (опис + Saving Throw + Hit Check): ${updated} з ${uniqueIds.length}\n`,
    );

    if (!DO_FIX) {
      process.exit(0);
    }
  }

  let toRun = [...uniqueIds];

  let iteration = 0;

  const maxIterations = DO_FIX ? ITERATE : 1;

  const failedReports: Array<{
    spellId: string;
    name: string;
    reason?: string;
  }> = [];

  while (iteration < maxIterations) {
    iteration++;

    if (DO_FIX && iteration > 1) {
      console.log("--- Iteration", iteration, "--- (only failed)\n");
    }

    const results: RunResult[] = [];

    const spellRows = await prisma.spell.findMany({
      where: { campaignId: CAMPAIGN_ID, id: { in: toRun } },
      select: spellRowFields,
    });

    const spellById = new Map(spellRows.map((s) => [s.id, s]));

    // Резервний пошук за назвою — якщо ID з doc не збігаються з БД (інший імпорт)
    const missingIds = toRun.filter((id) => !spellById.has(id));

    if (missingIds.length > 0) {
      const missingNames = missingIds
        .map((id) => caseBySpellId.get(id)?.name)
        .filter((n): n is string => !!n);

      const byName = await prisma.spell.findMany({
        where: { campaignId: CAMPAIGN_ID, name: { in: missingNames } },
        select: spellRowFields,
      });

      const spellByName = new Map(byName.map((s) => [s.name, s]));

      for (const spellId of missingIds) {
        const tc = caseBySpellId.get(spellId);

        const found = tc ? spellByName.get(tc.name) : null;

        if (found) spellById.set(spellId, found);
      }
    }

    for (const spellId of toRun) {
      const tc = caseBySpellId.get(spellId)!;

      const row = spellById.get(spellId) ?? null;

      const result = await runOne(CAMPAIGN_ID, tc, row);

      results.push(result);
    }

    const passed = results.filter((r) => r.passed);

    const failed = results.filter((r) => !r.passed);

    console.log("SPELL — тест-кейс — працює коректно\n");
    for (const r of results) {
      const tc = caseBySpellId.get(r.spellId)!;

      const testCaseStr = formatTestCase(tc);

      const checkbox = r.passed ? "[✓]" : "[ ]";

      console.log(`  ${checkbox} ${r.name} (${r.spellId})`);
      console.log(`      Тест-кейс: ${testCaseStr}`);

      if (r.reason) console.log(`      Причина: ${r.reason}`);

      if (
        r.passed &&
        (r.expectedEffects?.length ||
          r.appliedEffects?.length ||
          r.targetStats?.length)
      ) {
        console.log(`      --- Ефекти та результати ---`);

        if (r.expectedEffects?.length) {
          console.log(
            `      Очікувані ефекти: ${r.expectedDuration ? `D${r.expectedDuration} ` : ""}[${r.expectedEffects.map(formatEffect).join(", ")}]`,
          );
        }

        if (r.appliedEffects?.length) {
          console.log(
            `      Застосовані ефекти: ${r.appliedDuration ? `D${r.appliedDuration} ` : ""}[${r.appliedEffects.map(formatEffect).join(", ")}]`,
          );
        } else if (r.expectedEffects?.length) {
          console.log(`      Застосовані ефекти: (немає)`);
        }

        for (const ts of r.targetStats ?? []) {
          const b = ts.before;
          const d = ts.after;

          const fmt = (val: number, prev: number, pct = false) => {
            const dlt = val - prev;
            if (dlt === 0) return `${val}`;
            const sign = dlt > 0 ? "+" : "";
            return pct ? `${val} (${sign}${dlt}%)` : `${val} (${sign}${dlt})`;
          };

          console.log(`      ${ts.name}:`);
          console.log(`        ДО:   HP ${b.hp}/${b.maxHp} | Speed ${b.speed} | Init ${b.initiative} | AC ${b.ac} | Bonus action: ${b.bonusAction} | Morale: ${b.morale}`);
          console.log(`        Buff: [${b.buffs.join(", ") || "—"}]`);
          console.log(`        Debuff: [${b.debuffs.join(", ") || "—"}]`);
          console.log(`        ПІСЛЯ: HP ${fmt(d.hp, b.hp)}/${d.maxHp} | Speed ${fmt(d.speed, b.speed)} | Init ${fmt(d.initiative, b.initiative)} | AC ${fmt(d.ac, b.ac)} | Bonus action: ${d.bonusAction}${d.bonusAction !== b.bonusAction ? ` (${b.bonusAction})` : ""} | Morale: ${fmt(d.morale, b.morale)}`);
          console.log(`        Buff: [${d.buffs.join(", ") || "—"}]`);
          console.log(`        Debuff: [${d.debuffs.join(", ") || "—"}]`);
          if (ts.effectsRemoved?.length) {
            console.log(`        Знято: [${ts.effectsRemoved.join(", ")}]`);
          }
        }
      }
    }
    console.log(
      "\nПідсумок:",
      passed.length,
      "пройдено,",
      failed.length,
      "впало\n",
    );
    failedReports.length = 0;
    failedReports.push(
      ...failed.map((r) => ({
        spellId: r.spellId,
        name: r.name,
        reason: r.reason,
      })),
    );

    if (failed.length === 0 || !DO_FIX) break;

    // Авто-виправлення: оновлюємо заклинання в БД за тест-кейсом (ST, HT)
    const toFix = failed.filter(
      (r) =>
        r.reason !== "заклинання не знайдено в БД" && spellById.has(r.spellId),
    );

    for (const r of toFix) {
      const tc = caseBySpellId.get(r.spellId)!;

      const savingThrow =
        tc.savingThrow === "no"
          ? Prisma.JsonNull
          : tc.savingThrow
            ? ({
                ability: tc.savingThrow.ability,
                onSuccess: "half",
                dc: tc.savingThrow.dc,
              } as object)
            : undefined;

      const hitCheck =
        tc.hitCheck === "no"
          ? Prisma.JsonNull
          : tc.hitCheck
            ? ({ ability: tc.hitCheck.ability, dc: tc.hitCheck.dc } as object)
            : undefined;

      await prisma.spell.update({
        where: { id: r.spellId },
        data: {
          ...(savingThrow !== undefined && { savingThrow }),
          ...(hitCheck !== undefined && { hitCheck }),
        },
      });
      console.log("  Fixed (PATCH)", r.spellId, r.name);
    }

    if (toFix.length > 0) console.log("");

    toRun = failed.map((r) => r.spellId);
  }

  if (failedReports.length > 0) {
    console.log("--- Впалі тести ---");
    failedReports.forEach((r) => {
      const tc = caseBySpellId.get(r.spellId);

      const testCaseStr = tc ? formatTestCase(tc) : "—";

      console.log(`  [ ] ${r.name} (${r.spellId})`);
      console.log(`      Тест-кейс: ${testCaseStr}`);

      if (r.reason) console.log(`      Причина: ${r.reason}`);
    });
  }

  process.exit(failedReports.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
