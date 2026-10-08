import type { LibraryUnit } from "../types";
import { alliesAura, buffAlly, doubleStrike, falloff, fearAura, hatred, healAlly, magicResist, rage, regeneration, restoreSlotOnce, stun } from "../unit-abilities";

import type { Ability } from "@/lib/utils/abilities/schema";

const base = { raceKey: "elves" } as const;

const thorns = () => falloff("Колючки");

const unicornAura = () => alliesAura("Аура опору магії", { kind: "flag", flag: "resistance", damageType: "spell", percent: 20 });

const ent = () => [regeneration(10), stun("Сплутування", 25)];

const waspSwarm = (): Ability => ({
  id: "unit-wasp-swarm",
  name: "Рій ос",
  description: "Бонусна дія, раз за бій: ціль отримує 1d6 шкоди (poison) щораунду протягом 3 раундів.",
  trigger: { event: "bonusAction" },
  limits: { perBattle: 1 },
  effects: [{ kind: "dot", damagePerRound: "1d6", damageType: "poison", duration: { rounds: 3 }, target: "eventTarget" }],
});

const radiance = (): Ability => ({
  id: "unit-radiance",
  name: "Сяйво",
  description: "На початку раунду кожен союзник лікується на 5 % максимального HP.",
  trigger: { event: "roundStart" },
  effects: [{ kind: "heal", amount: { percentOf: "maxHp", value: 5 }, target: "allAllies" }],
});

export const ELF_UNITS: LibraryUnit[] = [
  { ...base, key: "elves-fairy", name: "Фея", tier: 1, role: "base", hp: 12, ac: 11, attackBonus: 3, initiative: 12, flying: true, attacks: [{ name: "Колючки", type: "melee", dice: "1d6+1", damageType: "piercing", targets: 2 }], abilities: [thorns()] },
  { ...base, key: "elves-dryad", name: "Дріада", tier: 1, role: "upgrade", hp: 13, ac: 12, attackBonus: 4, initiative: 12, flying: true, attacks: [{ name: "Колючки", type: "melee", dice: "1d6+2", damageType: "piercing", targets: 2 }], abilities: [thorns(), waspSwarm()] },
  { ...base, key: "elves-nymph", name: "Німфа", tier: 1, role: "alt", hp: 13, ac: 12, attackBonus: 4, initiative: 12, flying: true, attacks: [{ name: "Колючки", type: "melee", dice: "1d6+2", damageType: "piercing", targets: 2 }], abilities: [thorns(), healAlly("Симбіоз", "1d8", { bonus: true })] },
  { ...base, key: "elves-blade-dancer", name: "Танцюючий з клинками", tier: 2, role: "base", hp: 22, ac: 13, attackBonus: 4, initiative: 12, attacks: [{ name: "Клинки", type: "melee", dice: "1d8+3", damageType: "slashing" }], abilities: [] },
  { ...base, key: "elves-death-dancer", name: "Танцюючий зі смертю", tier: 2, role: "upgrade", hp: 24, ac: 13, attackBonus: 5, initiative: 12, attacks: [{ name: "Клинки", type: "melee", dice: "1d8+4", damageType: "slashing", targets: 3 }], abilities: [falloff("Танок смерті")] },
  { ...base, key: "elves-wind-dancer", name: "Танцюючий із вітром", tier: 2, role: "alt", hp: 24, ac: 15, attackBonus: 5, initiative: 16, attacks: [{ name: "Клинки", type: "melee", dice: "1d8+4", damageType: "slashing" }], abilities: [] },
  { ...base, key: "elves-archer", name: "Ельф-лучник", tier: 3, role: "base", hp: 30, ac: 13, attackBonus: 5, initiative: 10, attacks: [{ name: "Довгий лук", type: "ranged", dice: "1d10+3", damageType: "piercing" }], abilities: [] },
  { ...base, key: "elves-bow-master", name: "Майстер лука", tier: 3, role: "upgrade", hp: 34, ac: 14, attackBonus: 6, initiative: 10, attacks: [{ name: "Довгий лук", type: "ranged", dice: "1d10+4", damageType: "piercing" }], abilities: [doubleStrike("Подвійний постріл", 30)] },
  { ...base, key: "elves-forest-ranger", name: "Лісовий стрілок", tier: 3, role: "alt", hp: 33, ac: 14, attackBonus: 6, initiative: 10, attacks: [{ name: "Довгий лук", type: "ranged", dice: "1d10+4", damageType: "piercing" }], abilities: [hatred("Ненависть", ["Темні ельфи"])] },
  { ...base, key: "elves-druid", name: "Друїд", tier: 4, role: "base", hp: 50, ac: 13, attackBonus: 6, initiative: 10, attacks: [{ name: "Терновий постріл", type: "ranged", dice: "2d6+5", damageType: "piercing" }], abilities: [], spellKeys: ["thorny-vines", "healing-word"] },
  { ...base, key: "elves-elder-druid", name: "Старший друїд", tier: 4, role: "upgrade", hp: 56, ac: 14, attackBonus: 7, initiative: 10, attacks: [{ name: "Терновий постріл", type: "ranged", dice: "2d6+6", damageType: "piercing" }], abilities: [alliesAura("Аура тайної сили", { kind: "modifyStat", stat: "attackBonus", flat: 1 })], spellKeys: ["thorny-vines", "healing-word", "entangle"] },
  { ...base, key: "elves-high-druid", name: "Верховний друїд", tier: 4, role: "alt", hp: 55, ac: 14, attackBonus: 7, initiative: 10, attacks: [{ name: "Терновий постріл", type: "ranged", dice: "2d6+6", damageType: "piercing" }], abilities: [restoreSlotOnce("Передача мани")], spellKeys: ["healing-word", "moonbeam"] },
  { ...base, key: "elves-unicorn", name: "Єдиноріг", tier: 5, role: "base", hp: 90, ac: 15, attackBonus: 7, initiative: 12, attacks: [{ name: "Ріг", type: "melee", dice: "3d8+7", damageType: "piercing" }], abilities: [unicornAura()] },
  { ...base, key: "elves-war-unicorn", name: "Бойовий єдиноріг", tier: 5, role: "upgrade", hp: 100, ac: 16, attackBonus: 8, initiative: 12, attacks: [{ name: "Ріг", type: "melee", dice: "3d8+9", damageType: "piercing" }], abilities: [unicornAura(), stun("Осліплюючий ріг", 20)] },
  { ...base, key: "elves-light-unicorn", name: "Світлий єдиноріг", tier: 5, role: "alt", hp: 98, ac: 16, attackBonus: 8, initiative: 12, attacks: [{ name: "Ріг", type: "melee", dice: "3d8+9", damageType: "radiant" }], abilities: [unicornAura(), radiance()] },
  { ...base, key: "elves-ent", name: "Ент", tier: 6, role: "base", hp: 145, ac: 17, attackBonus: 8, initiative: 7, attacks: [{ name: "Кулак", type: "melee", dice: "3d8+12", damageType: "bludgeoning" }], abilities: ent() },
  { ...base, key: "elves-ancient-ent", name: "Древній ент", tier: 6, role: "upgrade", hp: 160, ac: 18, attackBonus: 9, initiative: 7, attacks: [{ name: "Кулак", type: "melee", dice: "3d8+14", damageType: "bludgeoning" }], abilities: [...ent(), buffAlly("Вкорінення", [{ stat: "armor", flat: 3 }], 1, { bonus: true, self: true })] },
  { ...base, key: "elves-wild-ent", name: "Дикий ент", tier: 6, role: "alt", hp: 155, ac: 17, attackBonus: 9, initiative: 8, attacks: [{ name: "Кулак", type: "melee", dice: "3d10+14", damageType: "bludgeoning" }, { name: "Кидок каменя", type: "ranged", dice: "3d8+10", damageType: "bludgeoning" }], abilities: [rage()] },
  { ...base, key: "elves-green-dragon", name: "Зелений дракон", tier: 7, role: "base", hp: 220, ac: 18, attackBonus: 10, initiative: 12, flying: true, attacks: [{ name: "Кислотний подих", type: "melee", dice: "4d10+16", damageType: "acid", targets: 2 }], abilities: [falloff("Кислотний подих")] },
  { ...base, key: "elves-emerald-dragon", name: "Смарагдовий дракон", tier: 7, role: "upgrade", hp: 245, ac: 19, attackBonus: 11, initiative: 12, flying: true, attacks: [{ name: "Кислотний подих", type: "melee", dice: "4d10+20", damageType: "acid", targets: 2 }], abilities: [falloff("Кислотний подих"), fearAura("Аура величі")] },
  { ...base, key: "elves-crystal-dragon", name: "Кристалічний дракон", tier: 7, role: "alt", hp: 240, ac: 18, attackBonus: 11, initiative: 12, flying: true, attacks: [{ name: "Кристалічний подих", type: "melee", dice: "4d10+18", damageType: "force", targets: 2 }], abilities: [falloff("Кристалічний подих"), magicResist(50)] },
];
