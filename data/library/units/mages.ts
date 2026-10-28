import type { LibraryUnit } from "../types";
import { alliesAura, bravery, buffAlly, chaosAbsorb, chaosVulnerabilityAura, construct, debuff, disable, elementResist, falloff, fearAura, healAlly, magicResist, noRetaliation, oncePerBattleAoe, piercingShot, restoreSlotOnce, unlimitedRetaliation, wheelOfFortune } from "../unit-abilities";

import type { Ability } from "@/lib/utils/abilities/schema";

export const onslaught: Ability = {
  id: "unit-onslaught",
  name: "Натиск",
  description: "Бонусна дія: +3 до ініціативи і +2 до атаки на 2 раунди. Перезарядка 3 раунди.",
  trigger: { event: "bonusAction" },
  limits: { cooldownRounds: 3 },
  effects: [
    { kind: "modifyStat", stat: "initiative", flat: 3, duration: { rounds: 2 }, target: "self" },
    { kind: "modifyStat", stat: "attackBonus", flat: 2, duration: { rounds: 2 }, target: "self" },
  ],
};

const base = { raceKey: "mages" } as const;

const spellSuppression = () => alliesAura("Аура пригнічення магії", { kind: "flag", flag: "resistance", damageType: "spell", percent: 20 });

export const MAGE_UNITS: LibraryUnit[] = [
  { ...base, key: "mages-gremlin", name: "Гремлін", tier: 1, role: "base", speed: 15, hp: 25, ac: 12, attackBonus: 5, initiative: 7, attacks: [{ name: "Гайковий пістолет", type: "ranged", dice: "1d6", damageType: "piercing" }], abilities: [] },
  { ...base, key: "mages-senior-gremlin", name: "Старший гремлін", tier: 1, role: "upgrade", speed: 25, hp: 31, ac: 13, attackBonus: 6, initiative: 11, attacks: [{ name: "Гайковий пістолет", type: "ranged", dice: "1d6+1", damageType: "piercing" }], abilities: [healAlly("Ремонт", "2d6", { bonus: true, targetRaceNote: "Механізм" })] },
  { ...base, key: "mages-gremlin-saboteur", name: "Гремлін-саботажник", tier: 1, role: "alt", speed: 25, hp: 31, ac: 13, attackBonus: 6, initiative: 12, attacks: [{ name: "Гайковий пістолет", type: "ranged", dice: "1d6+1", damageType: "piercing" }], abilities: [disable("Саботаж", "disable_ranged_attacks", 20)] },
  { ...base, key: "mages-gargoyle", name: "Гаргуля", tier: 2, role: "base", speed: 30, hp: 41, ac: 14, attackBonus: 5, initiative: 9, flying: true, attacks: [{ name: "Кам'яні пазурі", type: "melee", dice: "1d8+2", damageType: "slashing" }], abilities: [construct(), elementResist(["fire", "cold", "lightning"], 25, "Опір стихіям")] },
  { ...base, key: "mages-obsidian-gargoyle", name: "Обсидіанова гаргуля", tier: 2, role: "upgrade", speed: 35, hp: 47, ac: 15, attackBonus: 6, initiative: 10, flying: true, attacks: [{ name: "Кам'яні пазурі", type: "melee", dice: "1d8+3", damageType: "slashing" }], abilities: [construct(), elementResist(["fire", "cold", "lightning"], 50, "Опір стихіям")] },
  { ...base, key: "mages-elemental-gargoyle", name: "Гаргуля стихій", tier: 2, role: "alt", speed: 35, hp: 44, ac: 14, attackBonus: 6, initiative: 11, flying: true, attacks: [{ name: "Кам'яні пазурі", type: "melee", dice: "1d8+3", damageType: "slashing" }], abilities: [construct(), chaosVulnerabilityAura()] },
  { ...base, key: "mages-golem", name: "Голем", tier: 3, role: "base", speed: 20, hp: 62, ac: 14, attackBonus: 6, initiative: 7, attacks: [{ name: "Кулак", type: "melee", dice: "1d10+3", damageType: "bludgeoning" }], abilities: [construct(), magicResist(50)] },
  { ...base, key: "mages-steel-golem", name: "Сталевий голем", tier: 3, role: "upgrade", speed: 20, hp: 68, ac: 15, attackBonus: 7, initiative: 7, attacks: [{ name: "Кулак", type: "melee", dice: "1d10+4", damageType: "bludgeoning" }], abilities: [construct(), magicResist(75), unlimitedRetaliation()] },
  { ...base, key: "mages-magnetic-golem", name: "Магнетичний голем", tier: 3, role: "alt", speed: 20, hp: 64, ac: 15, attackBonus: 7, initiative: 9, attacks: [{ name: "Кулак", type: "melee", dice: "1d10+4", damageType: "bludgeoning" }], abilities: [construct(), magicResist(50), chaosAbsorb()] },
  { ...base, key: "mages-mage", name: "Маг", tier: 4, role: "base", speed: 20, hp: 66, ac: 12, attackBonus: 7, initiative: 10, attacks: [{ name: "Посох", type: "ranged", dice: "2d6+4", damageType: "lightning" }], abilities: [], spellKeys: ["eldritch-arrow", "stone-spikes", "ice-bolt", "lightning-bolt", "summon-air-elemental"] },
  { ...base, key: "mages-archmage", name: "Архімаг", tier: 4, role: "upgrade", speed: 20, hp: 74, ac: 13, attackBonus: 8, initiative: 10, attacks: [{ name: "Посох", type: "ranged", dice: "2d6+5", damageType: "lightning" }], abilities: [restoreSlotOnce("Енергетичний канал")], spellKeys: ["fireball", "fire-wall", "circle-of-winter", "chain-lightning", "meteor-shower", "cleansing"] },
  { ...base, key: "mages-battle-mage", name: "Бойовий маг", tier: 4, role: "alt", speed: 20, hp: 73, ac: 13, attackBonus: 8, initiative: 10, attacks: [{ name: "Посох", type: "ranged", dice: "2d6+6", damageType: "lightning" }], abilities: [spellSuppression(), piercingShot()], spellKeys: ["ice-bolt", "lightning-bolt"] },
  { ...base, key: "mages-genie", gridSize: 2, name: "Джин", tier: 5, role: "base", speed: 35, hp: 107, ac: 15, attackBonus: 7, initiative: 12, flying: true, attacks: [{ name: "Магічний удар", type: "melee", dice: "2d10+8", damageType: "force" }], abilities: [debuff("Прокляття", "attackBonus", 2, 2, 25)] },
  { ...base, key: "mages-genie-sultan", gridSize: 2, name: "Джин-султан", tier: 5, role: "upgrade", speed: 40, hp: 119, ac: 16, attackBonus: 8, initiative: 12, flying: true, attacks: [{ name: "Магічний удар", type: "melee", dice: "2d10+9", damageType: "force" }], abilities: [debuff("Прокляття", "attackBonus", 2, 2, 25), buffAlly("Благословення", [{ stat: "attackBonus", flat: 2 }], 2)] },
  { ...base, key: "mages-genie-vizier", gridSize: 2, name: "Джин-візир", tier: 5, role: "alt", speed: 40, hp: 117, ac: 16, attackBonus: 8, initiative: 12, flying: true, attacks: [{ name: "Магічний удар", type: "melee", dice: "2d10+9", damageType: "force" }], abilities: [wheelOfFortune()] },
  { ...base, key: "mages-rakshasa-princess", gridSize: 2, name: "Принцеса ракшасів", tier: 6, role: "base", speed: 25, hp: 148, ac: 16, attackBonus: 7, initiative: 9, attacks: [{ name: "Закривлені клинки", type: "melee", dice: "3d8+13", damageType: "slashing", targets: 2 }], abilities: [falloff("Закривлені клинки"), fearAura()] },
  { ...base, key: "mages-rakshasa-raja", gridSize: 2, name: "Раджа ракшасів", tier: 6, role: "upgrade", speed: 30, hp: 165, ac: 17, attackBonus: 8, initiative: 8, attacks: [{ name: "Закривлені клинки", type: "melee", dice: "3d8+15", damageType: "slashing", targets: 2 }], abilities: [falloff("Закривлені клинки"), fearAura(), noRetaliation()] },
  { ...base, key: "mages-rakshasa-kshatriya", gridSize: 2, name: "Ракшас-кшатрій", tier: 6, role: "alt", speed: 30, hp: 165, ac: 17, attackBonus: 8, initiative: 8, attacks: [{ name: "Вихор клинків", type: "melee", dice: "3d8+15", damageType: "slashing", targets: 3 }], abilities: [falloff("Вихор клинків"), onslaught] },
  { ...base, key: "mages-colossus", gridSize: 2, name: "Колос", tier: 7, role: "base", speed: 30, hp: 220, ac: 16, attackBonus: 8, initiative: 10, attacks: [{ name: "Кулак", type: "melee", dice: "4d10+16", damageType: "bludgeoning" }], abilities: [bravery(), oncePerBattleAoe("Землетрус", { percentOfAttack: 50, targets: "all", stunChance: 25 })] },
  { ...base, key: "mages-titan", gridSize: 2, name: "Титан", tier: 7, role: "upgrade", speed: 30, hp: 250, ac: 17, attackBonus: 9, initiative: 10, attacks: [{ name: "Блискавка", type: "ranged", dice: "4d10+20", damageType: "lightning" }], abilities: [bravery()] },
  { ...base, key: "mages-storm-lord", gridSize: 2, name: "Повелитель бурі", tier: 7, role: "alt", speed: 30, hp: 240, ac: 16, attackBonus: 9, initiative: 10, attacks: [{ name: "Блискавка", type: "ranged", dice: "4d10+18", damageType: "lightning" }], abilities: [oncePerBattleAoe("Виклик блискавки", { percentOfAttack: 50, targets: 3, stunChance: 25, damageType: "lightning" })] },
];
