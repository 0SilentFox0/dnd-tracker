import type { LibraryUnit } from "../types";
import { alliesAura, bigShield, bravery, debuff, dot, elementResist, extraDamage, falloff, finisher, fireWave, guardian, oncePerBattleAoe, rage, retaliateAura, stun } from "../unit-abilities";

import type { Ability } from "@/lib/utils/abilities/schema";

const base = { raceKey: "dwarves" } as const;

const fireImmunity = () => elementResist(["fire"], 100, "Імунітет до вогню");

const lightningImmunity = () => elementResist(["lightning"], 100, "Імунітет до блискавки");

const roar = (): Ability => ({
  id: "unit-roar",
  name: "Рик",
  description: "Бонусна дія, раз за бій: вороги отримують −1 до моралі на 2 раунди.",
  trigger: { event: "bonusAction" },
  limits: { perBattle: 1 },
  effects: [{ kind: "modifyStat", stat: "morale", flat: -1, duration: { rounds: 2 }, target: "allEnemies" }],
});

const FLAME_MARK = "arkat-flame-mark";

const flameMark = (): Ability[] => [
  {
    id: "unit-flame-mark",
    name: "Вогняна мітка",
    description: "Влучання позначає ціль на 2 раунди.",
    trigger: { event: "hit", role: "attacker" },
    effects: [{ kind: "mark", markId: FLAME_MARK, duration: { rounds: 2 }, target: "eventTarget" }],
  },
  alliesAura("Вогняна мітка: бонус союзників", { kind: "damageBonus", filter: { kind: "all" }, percent: 20, perMark: FLAME_MARK }),
];

const thane = () => [extraDamage("Блискавка", "1d10", "lightning"), lightningImmunity(), stun("Громовий удар", 20)];

export const DWARF_UNITS: LibraryUnit[] = [
  { ...base, key: "dwarves-mountain-defender", name: "Захисник гір", tier: 1, role: "base", speed: 20, hp: 31, ac: 14, attackBonus: 5, initiative: 9, attacks: [{ name: "Молот", type: "melee", dice: "1d6", damageType: "bludgeoning" }], abilities: [bigShield()] },
  { ...base, key: "dwarves-shield-bearer", name: "Щитоносець", tier: 1, role: "upgrade", speed: 20, hp: 36, ac: 15, attackBonus: 6, initiative: 9, attacks: [{ name: "Молот", type: "melee", dice: "1d6+1", damageType: "bludgeoning" }], abilities: [bigShield(), guardian(30)] },
  { ...base, key: "dwarves-mountain-guard", name: "Гірський вартовий", tier: 1, role: "alt", speed: 20, hp: 36, ac: 15, attackBonus: 6, initiative: 8, attacks: [{ name: "Молот", type: "melee", dice: "1d6+1", damageType: "bludgeoning" }], abilities: [bigShield(), rage()] },
  { ...base, key: "dwarves-spear-thrower", name: "Списометальник", tier: 2, role: "base", speed: 20, hp: 36, ac: 13, attackBonus: 5, initiative: 9, attacks: [{ name: "Метальний спис", type: "ranged", dice: "1d8+1", damageType: "piercing" }], abilities: [] },
  { ...base, key: "dwarves-spear-master", name: "Майстер списа", tier: 2, role: "upgrade", speed: 20, hp: 39, ac: 14, attackBonus: 6, initiative: 9, attacks: [{ name: "Метальний спис", type: "ranged", dice: "1d8+2", damageType: "piercing" }], abilities: [debuff("Підрізання", "initiative", 2, 2, 25)] },
  { ...base, key: "dwarves-harpooner", name: "Гарпунник", tier: 2, role: "alt", speed: 20, hp: 39, ac: 14, attackBonus: 6, initiative: 9, attacks: [{ name: "Гарпун", type: "ranged", dice: "1d8+2", damageType: "piercing" }], abilities: [debuff("Гарпун", "armor", 2, 1)] },
  { ...base, key: "dwarves-bear-rider", gridSize: 2, name: "Вершник на ведмеді", tier: 3, role: "base", speed: 30, hp: 56, ac: 14, attackBonus: 6, initiative: 10, attacks: [{ name: "Спис вершника", type: "melee", dice: "2d6+2", damageType: "piercing" }], abilities: [debuff("Удар лапою", "initiative", 3, 1)] },
  { ...base, key: "dwarves-black-bear-rider", gridSize: 2, name: "Вершник на чорному ведмеді", tier: 3, role: "upgrade", speed: 35, hp: 62, ac: 15, attackBonus: 7, initiative: 11, attacks: [{ name: "Спис вершника", type: "melee", dice: "2d6+2", damageType: "piercing" }], abilities: [debuff("Удар лапою", "initiative", 3, 1), stun("Збивання", 25)] },
  { ...base, key: "dwarves-white-bear-rider", gridSize: 2, name: "Вершник на білому ведмеді", tier: 3, role: "alt", speed: 35, hp: 62, ac: 15, attackBonus: 7, initiative: 11, attacks: [{ name: "Спис вершника", type: "melee", dice: "2d6+2", damageType: "piercing" }], abilities: [debuff("Удар лапою", "initiative", 3, 1), roar()] },
  { ...base, key: "dwarves-bonecrusher", name: "Костолом", tier: 4, role: "base", speed: 25, hp: 77, ac: 14, attackBonus: 7, initiative: 12, attacks: [{ name: "Дворучний молот", type: "melee", dice: "2d6+6", damageType: "bludgeoning" }], abilities: [debuff("Каліцтво", "attackBonus", 2, 2, 25)] },
  { ...base, key: "dwarves-berserker", name: "Берсерк", tier: 4, role: "upgrade", speed: 25, hp: 81, ac: 11, attackBonus: 8, initiative: 12, attacks: [{ name: "Дві сокири", type: "melee", dice: "2d8+6", damageType: "slashing" }], abilities: [bravery()] },
  { ...base, key: "dwarves-arkat-warrior", name: "Воїн Аркату", tier: 4, role: "alt", speed: 25, hp: 85, ac: 15, attackBonus: 8, initiative: 11, attacks: [{ name: "Сокира Аркату", type: "melee", dice: "2d6+6", damageType: "slashing" }], abilities: [finisher("Добивання", { type: "hpBelow", who: "eventTarget", percent: 50 }, { advantage: true })] },
  { ...base, key: "dwarves-rune-priest", name: "Рунний жрець", tier: 5, role: "base", speed: 15, hp: 91, ac: 14, attackBonus: 7, initiative: 8, attacks: [{ name: "Рунний жезл", type: "ranged", dice: "3d6+5", damageType: "fire" }], abilities: [], spellKeys: ["ice-bolt", "lightning-bolt"] },
  { ...base, key: "dwarves-flame-priest", name: "Жрець полум'я", tier: 5, role: "upgrade", speed: 15, hp: 100, ac: 15, attackBonus: 8, initiative: 10, attacks: [{ name: "Рунний жезл", type: "ranged", dice: "3d6+7", damageType: "fire" }], abilities: [retaliateAura("Вогонь помсти", 25, "fire")], spellKeys: ["ice-bolt", "lightning-bolt", "fireball", "fire-wall"] },
  { ...base, key: "dwarves-arkat-priest", name: "Жрець Аркату", tier: 5, role: "alt", speed: 15, hp: 98, ac: 15, attackBonus: 8, initiative: 9, attacks: [{ name: "Рунний жезл", type: "ranged", dice: "3d6+7", damageType: "fire" }], abilities: flameMark(), spellKeys: ["ice-bolt", "fireball", "lightning-bolt", "evasion"] },
  { ...base, key: "dwarves-thane", gridSize: 2, name: "Тан", tier: 6, role: "base", speed: 40, hp: 154, ac: 16, attackBonus: 7, initiative: 11, attacks: [{ name: "Громовий молот", type: "melee", dice: "3d8+9", damageType: "bludgeoning" }], abilities: thane() },
  { ...base, key: "dwarves-earl", gridSize: 2, name: "Ерл", tier: 6, role: "upgrade", speed: 40, hp: 171, ac: 17, attackBonus: 8, initiative: 11, attacks: [{ name: "Громовий молот", type: "melee", dice: "3d8+11", damageType: "bludgeoning" }], abilities: [...thane(), oncePerBattleAoe("Буря", { percentOfAttack: 100, targets: 3, damageType: "lightning" })] },
  { ...base, key: "dwarves-jarl", gridSize: 2, name: "Ярл", tier: 6, role: "alt", speed: 40, hp: 165, ac: 17, attackBonus: 8, initiative: 10, attacks: [{ name: "Вогняний молот", type: "melee", dice: "3d8+11", damageType: "bludgeoning" }], abilities: [extraDamage("Вогонь", "1d10", "fire"), fireImmunity(), fireWave()] },
  { ...base, key: "dwarves-fire-dragon", gridSize: 2, name: "Вогняний дракон", tier: 7, role: "base", speed: 25, hp: 220, ac: 16, attackBonus: 8, initiative: 9, attacks: [{ name: "Вогняні пазурі", type: "melee", dice: "4d10+16", damageType: "fire" }], abilities: [fireImmunity(), retaliateAura("Вогняна аура", 25, "fire")] },
  { ...base, key: "dwarves-lava-dragon", gridSize: 2, name: "Лавовий дракон", tier: 7, role: "upgrade", speed: 25, hp: 245, ac: 18, attackBonus: 9, initiative: 9, attacks: [{ name: "Лавовий подих", type: "melee", dice: "4d10+18", damageType: "fire", targets: 2 }], abilities: [fireImmunity(), retaliateAura("Вогняна аура", 25, "fire"), falloff("Подих")] },
  { ...base, key: "dwarves-arkat-dragon", gridSize: 2, name: "Дракон Аркату", tier: 7, role: "alt", speed: 25, hp: 240, ac: 16, attackBonus: 9, initiative: 9, attacks: [{ name: "Подих Аркату", type: "melee", dice: "4d10+20", damageType: "fire", targets: 2 }], abilities: [fireImmunity(), falloff("Подих"), dot("Опік", "2d6", "fire", 2)] },
];
