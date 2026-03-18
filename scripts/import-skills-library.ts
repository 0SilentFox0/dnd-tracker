#!/usr/bin/env tsx
/**
 * Імпорт бібліотеки скілів з docs/SKILLS.md у кампанію.
 * Повністю парсить тригери (26 типів), модифікатори (probability, oncePerBattle, тощо)
 * та зберігає ефекти у форматі, готовому для бойової системи.
 *
 * Використання:
 *   npx tsx scripts/import-skills-library.ts [campaignId]
 *
 * campaignId за замовчуванням — з lib/constants/campaigns.ts
 */

import { PrismaClient } from "@prisma/client";

import { DEFAULT_CAMPAIGN_ID } from "../lib/constants/campaigns";
import {
  getCanonicalMainSkillName,
  getMainSkillNameVariants,
} from "../lib/constants/main-skills";
import { loadSkillsFromDoc } from "./import-skills-library-parse";
import { triggerStringToSkillTriggers } from "./import-skills-library-triggers";
import type { LibraryEffect, LibrarySkill } from "./import-skills-library-types";

export { loadSkillsFromDoc, stripJsonComments } from "./import-skills-library-parse";
export { triggerStringToSkillTriggers } from "./import-skills-library-triggers";
export type { LibraryEffect, LibrarySkill } from "./import-skills-library-types";

const prisma = new PrismaClient();

function effectsToBonuses(effects: LibraryEffect[]): Record<string, number> {
  const bonuses: Record<string, number> = {};

  for (const e of effects) {
    if (e.type === "percent" && typeof e.value === "number") {
      bonuses[e.stat] = e.value;
    }

    if (e.type === "flat" && typeof e.value === "number") {
      bonuses[`${e.stat}_flat`] = e.value;
    }
  }

  return bonuses;
}

async function ensureMainSkill(
  campaignId: string,
  category: string,
  mainSkillFromSkill?: string
): Promise<string | null> {
  const canonicalName = getCanonicalMainSkillName(category, mainSkillFromSkill);

  const nameVariants = getMainSkillNameVariants(canonicalName);

  let main = await prisma.mainSkill.findFirst({
    where: { campaignId, name: { in: nameVariants } },
  });

  if (main && main.name !== canonicalName) {
    const oldName = main.name;

    main = await prisma.mainSkill.update({
      where: { id: main.id },
      data: { name: canonicalName },
    });
    console.log(`  MainSkill: "${oldName}" → "${canonicalName}"`);
  }

  if (!main) {
    main = await prisma.mainSkill.create({
      data: {
        campaignId,
        name: canonicalName,
        color: "#6366f1",
      },
    });
    console.log(`  MainSkill: ${canonicalName}`);
  }

  return main.id;
}

// ---------- Людино-читабельний опис ефекту ----------

const STAT_LABELS: Record<string, string> = {
  melee_damage: "шкода ближня",
  ranged_damage: "шкода дальня",
  all_damage: "шкода (вся)",
  counter_damage: "контр-атака",
  area_damage: "площинна шкода",
  bleed_damage: "кровотеча",
  poison_damage: "отрута",
  burn_damage: "опік",
  fire_damage: "вогняна шкода",
  armor: "броня",
  hp_bonus: "бонус HP",
  physical_resistance: "фіз. резист",
  spell_resistance: "маг. резист",
  all_resistance: "резист (увесь)",
  damage_resistance: "зниження шкоди",
  speed: "швидкість",
  initiative: "ініціатива",
  morale: "мораль",
  crit_threshold: "поріг криту",
  spell_levels: "рівень заклинань",
  spell_slots_lvl4_5: "слоти 4-5 рівня",
  spell_targets_lvl4_5: "цілі 4-5 рівня",
  advantage: "перевага",
  enemy_attack_disadvantage: "недолік атаки ворога",
  guaranteed_hit: "гарантований удар",
  attack_before_enemy: "атака першим",
  control_units: "контроль юнітів",
  summon_tier: "виклик істоти",
  redirect_physical_damage: "перенаправлення шкоди",
  marked_targets: "позначені цілі",
  extra_casts: "додаткові касти",
  restore_spell_slot: "відновлення слоту",
  field_damage: "пекельна земля",
  revive_hp: "воскресіння",
  clear_negative_effects: "зняття негативних ефектів",
  morale_per_kill: "мораль за вбивство",
  morale_per_ally_death: "мораль за смерть союзника",
  light_spells_target_all_allies: "заклинання світла на всіх",
};

function effectToHumanDescription(e: LibraryEffect): string {
  const label = STAT_LABELS[e.stat] || e.stat;

  if (e.type === "flag" || e.type === "ignore") {
    return label;
  }

  let valueStr = "";

  if (e.type === "percent" && typeof e.value === "number") {
    valueStr = `+${e.value}%`;
  } else if (e.type === "flat" && typeof e.value === "number") {
    valueStr = e.value > 0 ? `+${e.value}` : `${e.value}`;
  } else if (e.type === "formula" && typeof e.value === "string") {
    valueStr = `(${e.value})`;
  } else if (e.type === "dice" && typeof e.value === "string") {
    valueStr = e.value;
  } else if (e.type === "min" && typeof e.value === "number") {
    valueStr = `мін. ${e.value}`;
  } else if (e.type === "stack" && typeof e.value === "number") {
    valueStr = `×${e.value} стаків`;
  } else if (e.value !== undefined) {
    valueStr = String(e.value);
  }

  const durationStr = e.duration ? ` (${e.duration} р.)` : "";

  return `${label}: ${valueStr}${durationStr}`.trim();
}

// ---------- Upsert Skill ----------

async function upsertSkill(
  campaignId: string,
  mainSkillId: string | null,
  lib: LibrarySkill
): Promise<void> {
  // Генеруємо людино-читабельний опис з ефектів
  const description = lib.effects.length
    ? lib.effects
        .map((e) => effectToHumanDescription(e))
        .filter(Boolean)
        .join(". ")
    : "";

  const canonicalMainSkillName = getCanonicalMainSkillName(lib.category, lib.mainSkill);

  const basicInfo = {
    name: lib.name,
    description: description || null,
    icon: null as string | null,
    libraryId: lib.id,
    category: lib.category,
    mainSkill: canonicalMainSkillName,
    tier: lib.tier,
    triggerString: lib.trigger,
  };

  const bonuses = effectsToBonuses(lib.effects);

  const skillTriggers = triggerStringToSkillTriggers(lib.trigger);

  // Логуємо тригери для дебагу
  if (skillTriggers.length === 0) {
    console.log(`  ⚠️  Не вдалося розпарсити тригер: "${lib.trigger}" для ${lib.name}`);
  }

  const existing = await prisma.skill.findFirst({
    where: {
      campaignId,
      basicInfo: { path: ["libraryId"], equals: lib.id },
    },
  });

  const payload = {
    campaignId,
    name: lib.name,
    description: description || null,
    image: lib.image ?? null,
    mainSkillId,
    bonuses: bonuses as object,
    basicInfo: basicInfo as object,
    combatStats: { effects: lib.effects } as object,
    mainSkillData: mainSkillId ? { mainSkillId } : ({} as object),
    spellData: { spellNames: lib.spells } as object,
    spellEnhancementData: {},
    skillTriggers: skillTriggers as object[],
  };

  if (existing) {
    await prisma.skill.update({
      where: { id: existing.id },
      data: {
        name: payload.name,
        description: payload.description,
        image: payload.image,
        mainSkillId: payload.mainSkillId,
        bonuses: payload.bonuses,
        basicInfo: payload.basicInfo,
        combatStats: payload.combatStats,
        mainSkillData: payload.mainSkillData,
        spellData: payload.spellData,
        skillTriggers: payload.skillTriggers,
      },
    });
    console.log(`  Updated: ${lib.name} [${skillTriggers.map(t => t.type === "simple" ? t.trigger : "complex").join(", ")}]`);
  } else {
    await prisma.skill.create({
      data: payload,
    });
    console.log(`  Created: ${lib.name} [${skillTriggers.map(t => t.type === "simple" ? t.trigger : "complex").join(", ")}]`);
  }
}

// ---------- Main ----------

async function main() {
  const campaignId = process.argv[2] || DEFAULT_CAMPAIGN_ID;

  const docPath = process.argv[3] || "docs/SKILLS.md";

  console.log("Campaign ID:", campaignId);
  console.log("Reading:", docPath);

  const skills = loadSkillsFromDoc(docPath);

  console.log(`Loaded ${skills.length} skills\n`);

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    console.error("Campaign not found:", campaignId);
    process.exit(1);
  }

  // Статистика тригерів
  const triggerStats = new Map<string, number>();

  for (const lib of skills) {
    const mainSkillId = await ensureMainSkill(
      campaignId,
      lib.category,
      lib.mainSkill
    );

    await upsertSkill(campaignId, mainSkillId, lib);

    // Збираємо статистику
    const triggers = triggerStringToSkillTriggers(lib.trigger);

    for (const t of triggers) {
      const key = t.type === "simple" ? t.trigger : "complex";

      triggerStats.set(key, (triggerStats.get(key) ?? 0) + 1);
    }
  }

  // Перевірка: скіли згруповані по базовим навикам
  const byMain = await prisma.skill.groupBy({
    by: ["mainSkillId"],
    where: { campaignId },
    _count: { id: true },
  });

  const mainSkills = await prisma.mainSkill.findMany({
    where: { campaignId },
    select: { id: true, name: true },
  });

  const nameById = new Map(mainSkills.map((m) => [m.id, m.name]));

  console.log("\n--- Групування по базовим навикам ---");

  let total = 0;

  const sorted = byMain.sort((a, b) =>
    (a.mainSkillId ?? "").localeCompare(b.mainSkillId ?? "")
  );

  for (const g of sorted) {
    const name = g.mainSkillId
      ? nameById.get(g.mainSkillId) ?? "(невідомий id)"
      : "(без базового навику)";

    console.log(`  ${name}: ${g._count.id} скілів`);
    total += g._count.id;
  }
  console.log(`  Всього скілів у кампанії: ${total}`);

  if (total !== skills.length) {
    console.warn(`  Очікувалось з файлу: ${skills.length}`);
  }

  // Виводимо статистику тригерів
  console.log("\n--- Статистика тригерів ---");

  const sortedTriggers = [...triggerStats.entries()].sort((a, b) => b[1] - a[1]);

  for (const [trigger, count] of sortedTriggers) {
    console.log(`  ${trigger}: ${count} скілів`);
  }

  console.log("\nDone.");
}

// Запускати main лише коли скрипт викликають напряму (не при імпорті)
const isEntryPoint =
  typeof process !== "undefined" &&
  process.argv[1] != null &&
  process.argv[1].includes("import-skills-library");

if (isEntryPoint) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
