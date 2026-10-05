/**
 * Дані сценарію для `pnpm simulate-battle`: персонажі з різними прокачками й артефактами,
 * юніти з різними вміннями. Частина записів навмисно в старому форматі (abilities = NULL).
 */
import type { Prisma } from "@prisma/client";

import type { Ability } from "../lib/utils/abilities/schema";
import { weaponStatsColumns } from "../lib/utils/artifacts/weapon-stats";

export const SIM_USER = { id: "sim-dm-user", email: "sim-dm@local.test", displayName: "SIM DM" };

export const SIM_PLAYER = { id: "sim-player-user", email: "sim-player@local.test", displayName: "SIM Player" };

export const SIM_CAMPAIGN_NAME = "SIM: перевірка вмінь (3b)";

const ab = (id: string, name: string, rest: Omit<Ability, "id" | "name">): Ability => ({ id, name, ...rest });

const json = (v: unknown) => v as Prisma.InputJsonValue;

export const RACES = {
  human: { name: "Людина", abilities: json([]) },
  elf: {
    name: "Ельф",
    abilities: json([ab("elf-magic", "Ельфійська стійкість", { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "spell", percent: 25 }] })]),
  },
  // старий формат: імунітет з опису, abilities = NULL
  dwarf: { name: "Дварф", passiveAbility: json({ description: "Міцні як камінь. Імунітет до отруєння." }) },
  orc: { name: "Орк", abilities: json([]) },
};

export const SKILLS = {
  rage: { name: "Лють берсерка", abilities: [ab("rage", "Лють берсерка", { trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 20 }] })] },
  bleed: {
    name: "Кровопускання",
    abilities: [ab("bleed", "Кровопускання", { trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "dot", damagePerRound: 3, damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" }] })],
  },
  undying: { name: "Невмирущий", abilities: [ab("undying", "Невмирущий", { trigger: { event: "lethalDamage" }, limits: { perBattle: 1 }, effects: [{ kind: "heal", amount: 1, revive: true }] })] },
  secondWind: { name: "Друге дихання", abilities: [ab("second-wind", "Друге дихання", { trigger: { event: "bonusAction" }, limits: { perBattle: 1 }, effects: [{ kind: "heal", amount: 5 }] })] },
  ironSkin: { name: "Залізна шкіра", abilities: [ab("iron-skin", "Залізна шкіра", { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 2 }] })] },
  // старий формат: abilities = NULL, ефект у combatStats
  legacyGuard: { name: "Стара стійкість (legacy)", combatStats: json({ effects: [{ stat: "armor", type: "flat", value: 1 }] }), skillTriggers: json([{ type: "simple", trigger: "passive" }]) },
};

export function artifactRows(campaignId: string, setId: string) {
  return {
    sword: { campaignId, name: "Меч воїна", slot: "weapon", abilities: json([]), ...weaponStatsColumns({ damageDice: "1d8", damageType: "slashing", attackType: "melee", attackBonus: 2 }) },
    bow: { campaignId, name: "Довгий лук", slot: "range_weapon", abilities: json([]), ...weaponStatsColumns({ damageDice: "1d6", damageType: "piercing", attackType: "ranged", range: "150 ft", attackBonus: 1 }) },
    dagger: { campaignId, name: "Кинджал", slot: "weapon", abilities: json([]), ...weaponStatsColumns({ damageDice: "1d4", damageType: "piercing", attackType: "melee" }) },
    ring: {
      campaignId,
      name: "Кільце сили",
      slot: "ring",
      abilities: json([ab("ring-str", "Сила кільця", { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "strength", flat: 2 }] })]),
    },
    amulet: { campaignId, name: "Амулет дракона", slot: "amulet", setId, abilities: json([]) },
    cloak: { campaignId, name: "Плащ дракона", slot: "cloak", setId, abilities: json([]) },
  };
}

export const DRAGON_SET = {
  name: "Драконячий комплект",
  setBonus: json({ name: "Кров дракона", description: "Аура захисту для союзників" }),
  abilities: json([ab("dragon-aura", "Аура дракона", { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1, target: "allAllies" }] })]),
};

export const UNITS = {
  goblin: {
    name: "Гоблін-лучник",
    race: "Орк",
    maxHp: 14,
    armorClass: 12,
    initiative: 2,
    attacks: json([{ name: "Короткий лук", type: "ranged", attackBonus: 4, damageType: "piercing", damageDice: "1d6" }]),
    immunities: json(["отруєння"]),
    abilities: json([]),
  },
  shaman: {
    name: "Орк-шаман",
    race: "Орк",
    maxHp: 45,
    armorClass: 11,
    initiative: 1,
    attacks: json([{ name: "Посох", type: "melee", attackBonus: 3, damageType: "bludgeoning", damageDice: "1d6" }]),
    immunities: json([]),
    abilities: json([
      ab("shaman-aura", "Тотем племені", { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1, target: "allAllies" }] }),
      ab("shaman-heal", "Шаманське зцілення", { trigger: { event: "turnStart" }, limits: { perBattle: 2 }, effects: [{ kind: "heal", amount: 3 }] }),
    ]),
  },
  golem: {
    name: "Кам'яний голем",
    race: null,
    maxHp: 50,
    armorClass: 14,
    initiative: 0,
    attacks: json([{ name: "Кулак", type: "melee", attackBonus: 5, damageType: "bludgeoning", damageDice: "2d6" }]),
    immunities: json(["вогню", "контролю", "страху"]),
    abilities: json([ab("golem-stone", "Кам'яне тіло", { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "physical", percent: 50 }] })]),
  },
};
