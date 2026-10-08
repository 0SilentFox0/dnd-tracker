import type { LibraryUnit } from "../types";
import { alliesAura, armorBreak, bigShield, bravery, buffAlly, deathBlow, falloff, firstStrike, guardian, hatred, healAlly, resurrect, stun, unlimitedRetaliation } from "../unit-abilities";

import type { Ability } from "@/lib/utils/abilities/schema";

const HOLY_TARGETS = ["Некроманти", "Демони"];

const cleave: Ability = {
  id: "unit-cleave",
  name: "Розсікаючий удар",
  description: "Вбивство дає ще одну атаку, раз за хід.",
  trigger: { event: "kill", role: "killer" },
  limits: { perTurn: 1 },
  effects: [{ kind: "grantAction", extraActions: 1, target: "self" }],
};

const base = { raceKey: "humans" } as const;

export const HUMAN_UNITS: LibraryUnit[] = [
  { ...base, key: "humans-peasant", name: "Селянин", tier: 1, role: "base", hp: 12, ac: 10, attackBonus: 3, initiative: 8, attacks: [{ name: "Вила", type: "melee", dice: "1d6+1", damageType: "piercing" }], abilities: [] },
  { ...base, key: "humans-militia", name: "Ополченець", tier: 1, role: "upgrade", hp: 14, ac: 12, attackBonus: 4, initiative: 8, attacks: [{ name: "Кистень", type: "melee", dice: "1d6+2", damageType: "bludgeoning" }], abilities: [stun("Оглушення", 20)] },
  { ...base, key: "humans-brute", name: "Громила", tier: 1, role: "alt", hp: 14, ac: 11, attackBonus: 4, initiative: 8, attacks: [{ name: "Булава", type: "melee", dice: "1d8+2", damageType: "bludgeoning" }], abilities: [armorBreak("Броньобійність")] },
  { ...base, key: "humans-archer", name: "Лучник", tier: 2, role: "base", hp: 18, ac: 12, attackBonus: 4, initiative: 8, attacks: [{ name: "Лук", type: "ranged", dice: "1d8+1", damageType: "piercing" }], abilities: [] },
  { ...base, key: "humans-crossbowman", name: "Арбалетник", tier: 2, role: "upgrade", hp: 20, ac: 13, attackBonus: 5, initiative: 8, attacks: [{ name: "Арбалет", type: "ranged", dice: "1d10+2", damageType: "piercing" }], abilities: [deathBlow("Точний постріл", 25)] },
  { ...base, key: "humans-marksman", name: "Стрілець", tier: 2, role: "alt", hp: 20, ac: 12, attackBonus: 5, initiative: 8, attacks: [{ name: "Залп", type: "ranged", dice: "1d8+2", damageType: "piercing", targets: 3 }], abilities: [falloff("Залп")] },
  { ...base, key: "humans-swordsman", name: "Мечник", tier: 3, role: "base", hp: 38, ac: 15, attackBonus: 5, initiative: 8, attacks: [{ name: "Меч", type: "melee", dice: "1d8+4", damageType: "slashing" }], abilities: [bigShield()] },
  { ...base, key: "humans-squire", name: "Зброєносець", tier: 3, role: "upgrade", hp: 42, ac: 16, attackBonus: 6, initiative: 8, attacks: [{ name: "Меч", type: "melee", dice: "1d8+5", damageType: "slashing" }], abilities: [bigShield(), guardian(30)] },
  { ...base, key: "humans-defender-of-faith", name: "Захисник віри", tier: 3, role: "alt", hp: 40, ac: 14, attackBonus: 6, initiative: 10, attacks: [{ name: "Бойова сокира", type: "melee", dice: "1d10+6", damageType: "slashing" }], abilities: [cleave] },
  { ...base, key: "humans-griffin", name: "Грифон", tier: 4, role: "base", hp: 56, ac: 14, attackBonus: 6, initiative: 15, flying: true, attacks: [{ name: "Пазурі", type: "melee", dice: "2d6+6", damageType: "slashing" }], abilities: [unlimitedRetaliation()] },
  { ...base, key: "humans-royal-griffin", name: "Королівський грифон", tier: 4, role: "upgrade", hp: 64, ac: 15, attackBonus: 7, initiative: 15, flying: true, attacks: [{ name: "Пазурі", type: "melee", dice: "2d6+8", damageType: "slashing" }], abilities: [unlimitedRetaliation(), firstStrike("Пікірування")] },
  { ...base, key: "humans-battle-griffin", name: "Бойовий грифон", tier: 4, role: "alt", hp: 62, ac: 15, attackBonus: 7, initiative: 15, flying: true, attacks: [{ name: "Шквал", type: "melee", dice: "2d8+6", damageType: "slashing", targets: 2 }], abilities: [unlimitedRetaliation(), falloff("Шквал")] },
  { ...base, key: "humans-monk", name: "Монах", tier: 5, role: "base", hp: 76, ac: 14, attackBonus: 7, initiative: 10, attacks: [{ name: "Священний промінь", type: "ranged", dice: "3d6+6", damageType: "radiant" }], abilities: [hatred("Свята кара", HOLY_TARGETS)] },
  { ...base, key: "humans-inquisitor", name: "Інквізитор", tier: 5, role: "upgrade", hp: 84, ac: 15, attackBonus: 8, initiative: 10, attacks: [{ name: "Священний промінь", type: "ranged", dice: "3d6+8", damageType: "radiant" }], abilities: [hatred("Свята кара", HOLY_TARGETS), buffAlly("Божественна сила", [{ stat: "attackBonus", flat: 2 }], 2)] },
  { ...base, key: "humans-zealot", name: "Фанатик", tier: 5, role: "alt", hp: 82, ac: 15, attackBonus: 8, initiative: 10, attacks: [{ name: "Священний промінь", type: "ranged", dice: "3d6+8", damageType: "radiant" }], abilities: [hatred("Свята кара", HOLY_TARGETS), alliesAura("Аура опору магії", { kind: "flag", flag: "resistance", damageType: "spell", percent: 20 })] },
  { ...base, key: "humans-knight", name: "Лицар", tier: 6, role: "base", hp: 135, ac: 17, attackBonus: 8, initiative: 11, attacks: [{ name: "Спис", type: "melee", dice: "3d8+14", damageType: "piercing" }], abilities: [firstStrike("Таран")] },
  { ...base, key: "humans-paladin", name: "Паладин", tier: 6, role: "upgrade", hp: 150, ac: 18, attackBonus: 9, initiative: 11, attacks: [{ name: "Спис", type: "melee", dice: "3d8+16", damageType: "piercing" }], abilities: [firstStrike("Таран"), healAlly("Покладання рук", { percentOf: "maxHp", value: 50 }, { perBattle: 1, cleanse: true })] },
  { ...base, key: "humans-champion", name: "Чемпіон", tier: 6, role: "alt", hp: 150, ac: 17, attackBonus: 9, initiative: 11, attacks: [{ name: "Натиск", type: "melee", dice: "3d10+15", damageType: "piercing", targets: 2 }], abilities: [firstStrike("Таран"), falloff("Натиск")] },
  { ...base, key: "humans-angel", name: "Ангел", tier: 7, role: "base", hp: 210, ac: 18, attackBonus: 10, initiative: 11, flying: true, attacks: [{ name: "Священний меч", type: "melee", dice: "4d10+16", damageType: "radiant" }], abilities: [bravery()] },
  { ...base, key: "humans-archangel", name: "Архангел", tier: 7, role: "upgrade", hp: 240, ac: 19, attackBonus: 11, initiative: 11, flying: true, attacks: [{ name: "Священний меч", type: "melee", dice: "4d10+20", damageType: "radiant" }], abilities: [bravery(), resurrect()] },
  { ...base, key: "humans-seraph", name: "Серафим", tier: 7, role: "alt", hp: 230, ac: 18, attackBonus: 11, initiative: 11, flying: true, attacks: [{ name: "Священний меч", type: "melee", dice: "4d10+18", damageType: "radiant" }], abilities: [bravery(), stun("Оглушення", 25)], spellKeys: ["regeneration", "righteous-might"] },
];
