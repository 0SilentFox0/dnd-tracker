#!/usr/bin/env tsx
/**
 * Таблиця росту героїв: HP і шкода за архетипами, расами й рівнями (герой в пам'яті, без навичок і артефактів).
 * Потрібна кампанія «SIM: баланс бібліотеки» (pnpm balance-library її створює). Лише читання з локальної БД.
 *
 *   pnpm hero-growth-report [--out=docs/reports/hero-growth-2026-10.md]
 */
import { writeFileSync } from "node:fs";

import { ParticipantSide } from "../lib/constants/battle";
import { HERO_ARCHETYPE_KEYS, heroArchetype } from "../lib/constants/hero-archetypes";
import { prisma } from "../lib/db";
import { averageAttackDamage } from "../lib/utils/battle/damage/average";
import { createBattleParticipantFromCharacter } from "../lib/utils/battle/participant/from-character";
import { casterSpellDice } from "../lib/utils/battle/spell/caster-dice";
import { computeSpellPower } from "../lib/utils/battle/spell/power";
import type { CharacterFromPrisma } from "../lib/utils/battle/types/participant";
import type { BattleAttack } from "../types/battle";

const CAMPAIGN_NAME = "SIM: баланс бібліотеки";

const LEVELS = [1, 3, 6, 10, 15];

const out = process.argv.find((a) => a.startsWith("--out="))?.split("=")[1] ?? "docs/reports/hero-growth-2026-10.md";

interface Cell {
  hp: number;
  melee: number;
  ranged: number;
  magic: number;
}

const best = (c: Cell) => Math.max(c.melee, c.ranged, c.magic);

const f = (n: number) => String(Math.round(n * 10) / 10);

const ability = (kind: "melee" | "ranged" | "magic") => ({ melee: "strength", ranged: "dexterity", magic: "intelligence" })[kind];

async function hero(campaignId: string, race: string, archetype: string, level: number, kind: "melee" | "ranged" | "magic") {
  const fake = {
    id: "growth",
    campaignId,
    type: "player",
    controlledBy: "sim-player",
    name: "growth",
    level,
    class: "Hero",
    subclass: null,
    race,
    subrace: null,
    alignment: null,
    background: null,
    experience: 0,
    avatar: null,
    strength: ability(kind) === "strength" ? 14 : 10,
    dexterity: ability(kind) === "dexterity" ? 14 : 10,
    constitution: 12,
    intelligence: ability(kind) === "intelligence" ? 14 : 10,
    wisdom: 10,
    charisma: 10,
    armorClass: 10,
    initiative: 0,
    speed: 30,
    savingThrows: {},
    skills: {},
    spellcastingAbility: "intelligence",
    spellSlots: {},
    knownSpells: [],
    languages: [],
    proficiencies: {},
    skillTreeProgress: {},
    seenLevel: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    immunities: [],
    morale: 0,
    maxTargets: 1,
    minTargets: 1,
    personalSkillId: null,
    primaryAbility: null,
    goals: [],
    hpMultiplier: null,
    archetype: archetype === "universal" ? null : archetype,
    meleeMultiplier: null,
    rangedMultiplier: null,
    inventory: null,
  } as unknown as CharacterFromPrisma;

  return createBattleParticipantFromCharacter(fake, "", ParticipantSide.ALLY);
}

async function cell(campaignId: string, race: string, archetype: string, level: number): Promise<Cell> {
  const [melee, ranged, mage] = await Promise.all([hero(campaignId, race, archetype, level, "melee"), hero(campaignId, race, archetype, level, "ranged"), hero(campaignId, race, archetype, level, "magic")]);

  const dmg = (p: typeof melee, type: "melee" | "ranged") => averageAttackDamage(p, { name: "", type, attackBonus: 0, damageDice: "1d8", damageType: "physical" } as BattleAttack, [p]).total;

  const d = casterSpellDice(mage, { dice: 8, groupId: null });

  const magic = computeSpellPower({ caster: mage, groupId: null, rolls: Array(d.count).fill((d.sides + 1) / 2), participants: [mage] }).damage;

  return { hp: melee.combatStats.maxHp, melee: dmg(melee, "melee"), ranged: dmg(ranged, "ranged"), magic };
}

async function main() {
  const campaign = await prisma.campaign.findFirst({ where: { name: CAMPAIGN_NAME } });

  if (!campaign) throw new Error(`Немає кампанії «${CAMPAIGN_NAME}» — запустіть pnpm balance-library`);

  const races = (await prisma.race.findMany({ where: { campaignId: campaign.id }, select: { name: true }, orderBy: { name: "asc" } })).map((r) => r.name);

  const lines: string[] = ["## Компактна таблиця (середнє по расах): HP / найкраща шкода", "", `| Архетип | ${LEVELS.map((l) => `Рів. ${l}`).join(" | ")} |`, `|---|${LEVELS.map(() => "---").join("|")}|`];

  const detail: string[] = [];

  for (const key of HERO_ARCHETYPE_KEYS) {
    const a = heroArchetype(key);

    const rows: string[] = [`### ${a.name}`, "", `| Раса | ${LEVELS.map((l) => `Рів. ${l}`).join(" | ")} |`, `|---|${LEVELS.map(() => "---").join("|")}|`];

    const sums = LEVELS.map(() => ({ hp: 0, best: 0 }));

    for (const race of races) {
      const cells: string[] = [];

      for (const [i, level] of LEVELS.entries()) {
        const c = await cell(campaign.id, race, key, level);

        sums[i].hp += c.hp;
        sums[i].best += best(c);
        cells.push(`${f(c.hp)} / ${f(c.melee)} / ${f(c.ranged)} / ${f(c.magic)}`);
      }

      rows.push(`| ${race} | ${cells.join(" | ")} |`);
    }

    lines.push(`| ${a.name} | ${sums.map((s) => `${f(s.hp / races.length)} / ${f(s.best / races.length)}`).join(" | ")} |`);
    detail.push(...rows, "");
  }

  const text = [...lines, "", "## По расах і архетипах (клітинка: HP / ближній / дальній / магія)", "", ...detail].join("\n");

  writeFileSync(out, text);
  console.info(text);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
