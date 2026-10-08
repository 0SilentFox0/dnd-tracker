import type { LibraryUnit } from "../types";
import { elemental, falloff, fearAura, magicImmunity, physicalResist, retaliateAura, undead, unlimitedRetaliation } from "../unit-abilities";

import type { Ability } from "@/lib/utils/abilities/schema";

const base = { raceKey: null, tier: 4, role: "base" } as const;

const guaranteedHit = (): Ability => ({
  id: "unit-guaranteed-hit",
  name: "Гарантоване влучання",
  description: "Атаки цього юніта завжди влучають.",
  trigger: { event: "passive" },
  effects: [{ kind: "flag", flag: "guaranteedHit" }],
});

const reaper = (): Ability => ({
  id: "unit-reaper",
  name: "Жнець",
  description: "Влучання з шансом 10 %: ціль втрачає 25 % максимального HP.",
  trigger: { event: "hit", role: "attacker" },
  limits: { chance: 10 },
  effects: [{ kind: "dealDamage", amount: { percentOf: "maxHp", value: 25 }, damageType: "necrotic", target: "eventTarget" }],
});

const exhaustion = (): Ability => ({
  id: "unit-exhaustion",
  name: "Виснаження",
  description: "Влучання: шкода цілі знижена на 15 % на 2 раунди.",
  trigger: { event: "hit", role: "attacker" },
  effects: [{ kind: "damageBonus", filter: { kind: "all" }, percent: -15, duration: { rounds: 2 }, target: "eventTarget" }],
});

const rebirth = (): Ability => ({
  id: "unit-rebirth",
  name: "Відродження",
  description: "Раз за бій замість загибелі спалахує полум'ям і відроджується з 50 % максимального HP.",
  trigger: { event: "lethalDamage" },
  limits: { perBattle: 1 },
  effects: [{ kind: "heal", amount: { percentOf: "maxHp", value: 50 }, revive: true, target: "self" }],
});

export const NEUTRAL_UNITS: LibraryUnit[] = [
  { ...base, key: "neutral-fire-elemental", name: "Елементаль вогню", hp: 15, ac: 14, attackBonus: 3, initiative: 13, attacks: [{ name: "Полум'яний удар", type: "melee", dice: "2d6", damageType: "fire" }], abilities: [elemental("fire", "cold"), retaliateAura("Вогняний щит", 25, "fire")], levelScaling: { hpPerLevel: 6, damagePerLevel: 1, attackPerTwoLevels: 1 } },
  { ...base, key: "neutral-water-elemental", name: "Елементаль води", hp: 15, ac: 12, attackBonus: 3, initiative: 13, attacks: [{ name: "Крижана хвиля", type: "ranged", dice: "2d6", damageType: "cold" }], abilities: [elemental("cold", "fire")], spellKeys: ["ice-bolt"], levelScaling: { hpPerLevel: 6, damagePerLevel: 1, attackPerTwoLevels: 1 } },
  { ...base, key: "neutral-air-elemental", name: "Елементаль повітря", hp: 10, ac: 18, attackBonus: 3, initiative: 19, attacks: [{ name: "Удар блискавки", type: "melee", dice: "2d6", damageType: "lightning" }], abilities: [elemental("lightning"), guaranteedHit()], flying: true, levelScaling: { hpPerLevel: 4, damagePerLevel: 1, attackPerTwoLevels: 1 } },
  { ...base, key: "neutral-earth-elemental", name: "Елементаль землі", hp: 25, ac: 16, attackBonus: 3, initiative: 9, attacks: [{ name: "Кам'яний кулак", type: "melee", dice: "2d8", damageType: "bludgeoning" }], abilities: [elemental(null), magicImmunity(), unlimitedRetaliation(), physicalResist(25)], levelScaling: { hpPerLevel: 8, damagePerLevel: 1, attackPerTwoLevels: 1 } },
  { raceKey: null, key: "neutral-phoenix", name: "Фенікс", tier: 7, role: "base", hp: 40, ac: 16, attackBonus: 4, initiative: 16, attacks: [{ name: "Вогняні кігті", type: "melee", dice: "2d10", damageType: "fire", targets: 2 }], abilities: [elemental("fire", "cold"), falloff("Вогняний подих"), rebirth()], flying: true, levelScaling: { hpPerLevel: 10, damagePerLevel: 1, attackPerTwoLevels: 1 } },
  { raceKey: null, key: "neutral-death-avatar", name: "Аватар Смерті", tier: 7, role: "base", hp: 230, ac: 15, attackBonus: 9, initiative: 16, attacks: [{ name: "Дотик смерті", type: "melee", dice: "4d10+18", damageType: "necrotic" }], abilities: [undead(), fearAura(), reaper(), exhaustion()], flying: true },
];
