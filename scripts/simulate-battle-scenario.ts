/**
 * Дані сценарію для `pnpm simulate-battle`: персонажі з різними прокачками й артефактами,
 * юніти з різними вміннями.
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
  human: {
    name: "Людина",
    abilities: json([
      ab("human-counter", "Контратака", { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "counterAttack", attackKinds: ["melee"], bonusPercent: 50 }] }),
      ab("human-steady", "Незламність", { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "noNegativeMorale" }] }),
    ]),
  },
  elf: {
    name: "Ельф",
    abilities: json([
      ab("elf-magic", "Ельфійська стійкість", { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "spell", percent: 25 }] }),
      ab("elf-calm", "Ельфійський спокій", { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "ignoreMorale" }] }),
    ]),
  },
  // імунітет до отрути — з опису пасивки раси (race-effects)
  dwarf: { name: "Дварф", abilities: json([]), passiveAbility: json({ description: "Міцні як камінь. Імунітет до отруєння." }) },
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
  hunterEye: { name: "Око мисливця", abilities: [ab("hunter-eye", "Око мисливця", { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "psychic", percent: 10 }] })] },
  forestStep: { name: "Лісовий крок", abilities: [ab("forest-step", "Лісовий крок", { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "necrotic", percent: 10 }] })] },
  ironSkin: { name: "Залізна шкіра", abilities: [ab("iron-skin", "Залізна шкіра", { trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 2 }] })] },
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
    raceKey: "orc",
    maxHp: 14,
    armorClass: 12,
    initiative: 2,
    attacks: json([{ name: "Короткий лук", type: "ranged", attackBonus: 4, damageType: "piercing", damageDice: "1d6" }]),
    immunities: json(["отруєння"]),
    abilities: json([]),
  },
  shaman: {
    name: "Орк-шаман",
    raceKey: "orc",
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
    raceKey: null,
    maxHp: 50,
    armorClass: 14,
    initiative: 0,
    attacks: json([{ name: "Кулак", type: "melee", attackBonus: 5, damageType: "bludgeoning", damageDice: "2d6" }]),
    immunities: json(["вогню", "контролю", "страху"]),
    abilities: json([ab("golem-stone", "Кам'яне тіло", { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "physical", percent: 50 }] })]),
  },
};

export const FAIR_CAMPAIGN_NAME = "SIM: рівні бої";

/** Бібліотека юнітів кількох тірів без особливих умінь: масштабування видно в чистому вигляді. */
export const FAIR_UNITS = [
  { name: "Щур-мутант", level: 1, maxHp: 6, armorClass: 11, attacks: json([{ name: "Укус", type: "melee", attackBonus: 3, damageType: "piercing", damageDice: "1d6" }]) },
  { name: "Гоблін", level: 1, maxHp: 12, armorClass: 12, attacks: json([{ name: "Ніж", type: "melee", attackBonus: 3, damageType: "piercing", damageDice: "1d8" }]) },
  { name: "Вовк", level: 2, maxHp: 22, armorClass: 12, attacks: json([{ name: "Укус", type: "melee", attackBonus: 4, damageType: "piercing", damageDice: "2d6" }]) },
  { name: "Орк-воїн", level: 3, maxHp: 32, armorClass: 13, attacks: json([{ name: "Сокира", type: "melee", attackBonus: 5, damageType: "slashing", damageDice: "2d8" }]) },
  { name: "Огр", level: 4, maxHp: 60, armorClass: 11, attacks: json([{ name: "Дубина", type: "melee", attackBonus: 6, damageType: "bludgeoning", damageDice: "3d8" }]) },
  { name: "Троль", level: 5, maxHp: 90, armorClass: 14, attacks: json([{ name: "Кігті", type: "melee", attackBonus: 7, damageType: "slashing", damageDice: "4d8" }]) },
];

export const FAIR_HEROES = [
  { name: "Гарольд", class: "Fighter", strength: 16, dexterity: 12, constitution: 14, armorClass: 16, weapon: "sword" },
  { name: "Ельза", class: "Ranger", strength: 10, dexterity: 17, constitution: 12, armorClass: 14, weapon: "bow" },
  { name: "Бранд", class: "Barbarian", strength: 17, dexterity: 11, constitution: 15, armorClass: 14, weapon: "sword" },
  { name: "Мелітта", class: "Rogue", strength: 10, dexterity: 17, constitution: 11, armorClass: 14, weapon: "dagger" },
];

export const FAIR_WEAPONS = {
  sword: { name: "Меч", slot: "weapon", ...weaponStatsColumns({ damageDice: "1d8", damageType: "slashing", attackType: "melee", attackBonus: 2 }) },
  bow: { name: "Лук", slot: "range_weapon", ...weaponStatsColumns({ damageDice: "1d6", damageType: "piercing", attackType: "ranged", range: "150 ft", attackBonus: 1 }) },
  dagger: { name: "Кинджал", slot: "weapon", ...weaponStatsColumns({ damageDice: "1d4", damageType: "piercing", attackType: "melee" }) },
};

export const MECHANICS_CAMPAIGN_NAME = "SIM: нові механіки вмінь";

const melee = (name: string, bonus = 5, dice = "1d6") => json([{ name, type: "melee", attackBonus: bonus, damageType: "slashing", damageDice: dice }]);

export const MECHANICS_UNITS = (lightGroupId: string) => [
  {
    name: "Мисливець",
    side: "ally",
    maxHp: 60,
    armorClass: 14,
    initiative: 10,
    attacks: melee("Спис"),
    abilities: json([
      ab("hunter-mark", "Послідовний удар", { trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "mark", markId: "seq", duration: { rounds: 5 }, target: "eventTarget" }] }),
      ab("hunter-bonus", "Зосередження", { trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 50, perMark: "seq" }] }),
      ab("hunter-chance", "Азарт", { trigger: { event: "hit", role: "attacker" }, limits: { chance: 100 }, effects: [{ kind: "changeMorale", delta: 1 }] }),
    ]),
  },
  {
    name: "Страж",
    side: "ally",
    maxHp: 40,
    armorClass: 16,
    initiative: 8,
    attacks: melee("Щит"),
    abilities: json([ab("guard-bonus", "Прикрити", { trigger: { event: "bonusAction" }, effects: [{ kind: "guard", percent: 50, duration: { rounds: 5 }, target: "eventTarget" }] })]),
  },
  { name: "Підопічний", side: "ally", maxHp: 40, armorClass: 10, initiative: 6, attacks: melee("Кинджал"), abilities: json([]) },
  {
    name: "Жрець",
    side: "ally",
    maxHp: 30,
    armorClass: 12,
    initiative: 4,
    attacks: melee("Булава"),
    abilities: json([ab("priest-light", "Світло для всіх", { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "spellTargeting", mode: "all", school: lightGroupId }] })]),
  },
  { name: "Новачок", side: "ally", maxHp: 30, armorClass: 12, initiative: 2, attacks: melee("Меч"), abilities: json([]) },
  { name: "Опудало", side: "enemy", maxHp: 500, armorClass: 10, initiative: 0, attacks: melee("Удар", 5, "1d8"), abilities: json([]) },
  {
    name: "Дуелянт",
    side: "enemy",
    maxHp: 40,
    armorClass: 10,
    initiative: 1,
    attacks: melee("Рапіра"),
    abilities: json([
      ab("duelist-riposte", "Випереджальний удар", { trigger: { event: "attack", phase: "before", role: "target", attackKind: "melee" }, limits: { perRound: 1 }, effects: [{ kind: "dealDamage", amount: 1000, target: "eventActor" }] }),
    ]),
  },
];
