import type { LibraryUnit } from "../types";
import { alliesAura, bigShield, bravery, debuff, dot, elementResist, extraDamage, falloff, finisher, guardian, oncePerBattleAoe, rage, retaliateAura, stun } from "../unit-abilities";

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
  { ...base, key: "dwarves-mountain-defender", name: "Захисник гір", tier: 1, role: "base", hp: 13, ac: 13, attackBonus: 3, initiative: 7, attacks: [{ name: "Молот", type: "melee", dice: "1d6+1", damageType: "bludgeoning" }], abilities: [bigShield()] },
  { ...base, key: "dwarves-shield-bearer", name: "Щитоносець", tier: 1, role: "upgrade", hp: 15, ac: 14, attackBonus: 4, initiative: 7, attacks: [{ name: "Молот", type: "melee", dice: "1d6+2", damageType: "bludgeoning" }], abilities: [bigShield(), guardian(30)] },
  { ...base, key: "dwarves-mountain-guard", name: "Гірський вартовий", tier: 1, role: "alt", hp: 15, ac: 14, attackBonus: 4, initiative: 7, attacks: [{ name: "Молот", type: "melee", dice: "1d6+2", damageType: "bludgeoning" }], abilities: [bigShield(), rage()] },
  { ...base, key: "dwarves-spear-thrower", name: "Списометальник", tier: 2, role: "base", hp: 19, ac: 12, attackBonus: 4, initiative: 9, attacks: [{ name: "Метальний спис", type: "ranged", dice: "1d8+2", damageType: "piercing" }], abilities: [] },
  { ...base, key: "dwarves-spear-master", name: "Майстер списа", tier: 2, role: "upgrade", hp: 21, ac: 13, attackBonus: 5, initiative: 9, attacks: [{ name: "Метальний спис", type: "ranged", dice: "1d8+3", damageType: "piercing" }], abilities: [debuff("Підрізання", "initiative", 2, 2, 25)] },
  { ...base, key: "dwarves-harpooner", name: "Гарпунник", tier: 2, role: "alt", hp: 21, ac: 13, attackBonus: 5, initiative: 9, attacks: [{ name: "Гарпун", type: "ranged", dice: "1d8+3", damageType: "piercing" }], abilities: [debuff("Гарпун", "armor", 2, 1)] },
  { ...base, key: "dwarves-bear-rider", name: "Вершник на ведмеді", tier: 3, role: "base", hp: 36, ac: 14, attackBonus: 5, initiative: 10, attacks: [{ name: "Спис вершника", type: "melee", dice: "2d6+3", damageType: "piercing" }], abilities: [debuff("Удар лапою", "initiative", 3, 1)] },
  { ...base, key: "dwarves-black-bear-rider", name: "Вершник на чорному ведмеді", tier: 3, role: "upgrade", hp: 40, ac: 15, attackBonus: 6, initiative: 10, attacks: [{ name: "Спис вершника", type: "melee", dice: "2d6+4", damageType: "piercing" }], abilities: [debuff("Удар лапою", "initiative", 3, 1), stun("Збивання", 25)] },
  { ...base, key: "dwarves-white-bear-rider", name: "Вершник на білому ведмеді", tier: 3, role: "alt", hp: 40, ac: 15, attackBonus: 6, initiative: 10, attacks: [{ name: "Спис вершника", type: "melee", dice: "2d6+4", damageType: "piercing" }], abilities: [debuff("Удар лапою", "initiative", 3, 1), roar()] },
  { ...base, key: "dwarves-bonecrusher", name: "Костолом", tier: 4, role: "base", hp: 58, ac: 14, attackBonus: 6, initiative: 10, attacks: [{ name: "Дворучний молот", type: "melee", dice: "2d6+7", damageType: "bludgeoning" }], abilities: [debuff("Каліцтво", "attackBonus", 2, 2, 25)] },
  { ...base, key: "dwarves-berserker", name: "Берсерк", tier: 4, role: "upgrade", hp: 62, ac: 11, attackBonus: 7, initiative: 10, attacks: [{ name: "Дві сокири", type: "melee", dice: "2d8+8", damageType: "slashing" }], abilities: [bravery()] },
  { ...base, key: "dwarves-arkat-warrior", name: "Воїн Аркату", tier: 4, role: "alt", hp: 64, ac: 15, attackBonus: 7, initiative: 10, attacks: [{ name: "Сокира Аркату", type: "melee", dice: "2d6+8", damageType: "slashing" }], abilities: [finisher("Добивання", { type: "hpBelow", who: "eventTarget", percent: 50 }, { advantage: true })] },
  { ...base, key: "dwarves-rune-priest", name: "Рунний жрець", tier: 5, role: "base", hp: 77, ac: 14, attackBonus: 7, initiative: 10, attacks: [{ name: "Рунний жезл", type: "ranged", dice: "3d6+6", damageType: "fire" }], abilities: [], spellKeys: ["ice-bolt", "lightning-bolt"] },
  { ...base, key: "dwarves-flame-priest", name: "Жрець полум'я", tier: 5, role: "upgrade", hp: 84, ac: 15, attackBonus: 8, initiative: 10, attacks: [{ name: "Рунний жезл", type: "ranged", dice: "3d6+8", damageType: "fire" }], abilities: [retaliateAura("Вогонь помсти", 25, "fire")], spellKeys: ["fireball", "fire-wall"] },
  { ...base, key: "dwarves-arkat-priest", name: "Жрець Аркату", tier: 5, role: "alt", hp: 82, ac: 15, attackBonus: 8, initiative: 10, attacks: [{ name: "Рунний жезл", type: "ranged", dice: "3d6+8", damageType: "fire" }], abilities: flameMark(), spellKeys: ["ice-bolt", "fireball", "lightning-bolt"] },
  { ...base, key: "dwarves-thane", name: "Тан", tier: 6, role: "base", hp: 140, ac: 16, attackBonus: 8, initiative: 10, attacks: [{ name: "Громовий молот", type: "melee", dice: "3d8+10", damageType: "bludgeoning" }], abilities: thane() },
  { ...base, key: "dwarves-earl", name: "Ерл", tier: 6, role: "upgrade", hp: 155, ac: 17, attackBonus: 9, initiative: 10, attacks: [{ name: "Громовий молот", type: "melee", dice: "3d8+12", damageType: "bludgeoning" }], abilities: [...thane(), oncePerBattleAoe("Буря", { percentOfAttack: 100, targets: 3, damageType: "lightning" })] },
  { ...base, key: "dwarves-jarl", name: "Ярл", tier: 6, role: "alt", hp: 150, ac: 17, attackBonus: 9, initiative: 10, attacks: [{ name: "Вогняний молот", type: "melee", dice: "3d8+12", damageType: "bludgeoning" }], abilities: [extraDamage("Вогонь", "1d10", "fire"), fireImmunity(), oncePerBattleAoe("Вогняна куля", { percentOfAttack: 50, targets: "all", damageType: "fire" })] },
  { ...base, key: "dwarves-fire-dragon", name: "Вогняний дракон", tier: 7, role: "base", hp: 220, ac: 18, attackBonus: 10, initiative: 9, attacks: [{ name: "Вогняні пазурі", type: "melee", dice: "4d10+16", damageType: "fire" }], abilities: [fireImmunity(), retaliateAura("Вогняна аура", 25, "fire")] },
  { ...base, key: "dwarves-lava-dragon", name: "Лавовий дракон", tier: 7, role: "upgrade", hp: 245, ac: 20, attackBonus: 11, initiative: 9, attacks: [{ name: "Лавовий подих", type: "melee", dice: "4d10+18", damageType: "fire", targets: 2 }], abilities: [fireImmunity(), retaliateAura("Вогняна аура", 25, "fire"), falloff("Подих")] },
  { ...base, key: "dwarves-arkat-dragon", name: "Дракон Аркату", tier: 7, role: "alt", hp: 240, ac: 18, attackBonus: 11, initiative: 9, attacks: [{ name: "Подих Аркату", type: "melee", dice: "4d10+20", damageType: "fire", targets: 2 }], abilities: [fireImmunity(), falloff("Подих"), dot("Опік", "2d6", "fire", 2)] },
];
