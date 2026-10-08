import type { LibraryUnit } from "../types";
import { alliesAura, charmOnHit, critRange, dot, drainMana, elementResist, extraDamage, falloff, fearAura, finisher, firstStrike, magicResist, noRetaliation, rage, stun, summonGroupOnce } from "../unit-abilities";

const base = { raceKey: "demons" } as const;

const fireImmunity = () => elementResist(["fire"], 100, "Імунітет до вогню");

const cerberus = () => [noRetaliation(), falloff("Триголова")];

export const DEMON_UNITS: LibraryUnit[] = [
  { ...base, key: "demons-imp", name: "Біс", tier: 1, role: "base", hp: 28, ac: 12, attackBonus: 5, initiative: 13, attacks: [{ name: "Кігті", type: "melee", dice: "1d6", damageType: "slashing" }], abilities: [] },
  { ...base, key: "demons-familiar", name: "Чортеня", tier: 1, role: "upgrade", hp: 32, ac: 13, attackBonus: 6, initiative: 13, attacks: [{ name: "Кігті", type: "melee", dice: "1d6+1", damageType: "slashing" }], abilities: [drainMana()] },
  { ...base, key: "demons-devilkin", name: "Дияволя", tier: 1, role: "alt", hp: 32, ac: 13, attackBonus: 6, initiative: 13, attacks: [{ name: "Кігті", type: "melee", dice: "1d6+1", damageType: "slashing" }], abilities: [magicResist(25)] },
  { ...base, key: "demons-demon", name: "Демон", tier: 2, role: "base", hp: 41, ac: 13, attackBonus: 5, initiative: 8, attacks: [{ name: "Пекельний клинок", type: "melee", dice: "1d6+1", damageType: "slashing" }], abilities: [extraDamage("Пекельне полум'я", "1d4", "fire")] },
  { ...base, key: "demons-fire-demon", name: "Вогняний демон", tier: 2, role: "upgrade", hp: 47, ac: 14, attackBonus: 6, initiative: 8, attacks: [{ name: "Пекельний клинок", type: "melee", dice: "1d6+2", damageType: "slashing" }], abilities: [extraDamage("Пекельне полум'я", "1d6", "fire"), fireImmunity()] },
  { ...base, key: "demons-elder-demon", name: "Старший демон", tier: 2, role: "alt", hp: 44, ac: 14, attackBonus: 6, initiative: 9, attacks: [{ name: "Пекельний клинок", type: "melee", dice: "1d8+2", damageType: "slashing" }], abilities: [extraDamage("Пекельне полум'я", "1d4", "fire"), rage()] },
  { ...base, key: "demons-hound", name: "Гонча", tier: 3, role: "base", hp: 56, ac: 13, attackBonus: 6, initiative: 13, attacks: [{ name: "Укус", type: "melee", dice: "2d6+2", damageType: "piercing" }], abilities: [firstStrike("Таран")] },
  { ...base, key: "demons-cerberus", name: "Цербер", tier: 3, role: "upgrade", hp: 62, ac: 14, attackBonus: 7, initiative: 13, attacks: [{ name: "Три голови", type: "melee", dice: "2d6+2", damageType: "piercing", targets: 3 }], abilities: cerberus() },
  { ...base, key: "demons-fire-cerberus", name: "Вогняний цербер", tier: 3, role: "alt", hp: 60, ac: 14, attackBonus: 7, initiative: 13, attacks: [{ name: "Три голови", type: "melee", dice: "2d6+2", damageType: "fire", targets: 3 }], abilities: [falloff("Триголова"), fireImmunity(), dot("Опік", "1d6", "fire", 2)] },
  { ...base, key: "demons-succubus", name: "Суккуб", tier: 4, role: "base", hp: 66, ac: 13, attackBonus: 7, initiative: 10, attacks: [{ name: "Темний постріл", type: "ranged", dice: "2d6+4", damageType: "necrotic" }], abilities: [] },
  { ...base, key: "demons-demoness", name: "Демониця", tier: 4, role: "upgrade", hp: 74, ac: 14, attackBonus: 8, initiative: 10, attacks: [{ name: "Ланцюговий постріл", type: "ranged", dice: "2d6+5", damageType: "necrotic", targets: 3 }], abilities: [falloff("Ланцюговий постріл")] },
  { ...base, key: "demons-temptress", name: "Спокусниця", tier: 4, role: "alt", hp: 73, ac: 14, attackBonus: 8, initiative: 10, attacks: [{ name: "Темний постріл", type: "ranged", dice: "2d6+5", damageType: "necrotic" }], abilities: [charmOnHit("Спокуса", 15)] },
  { ...base, key: "demons-nightmare", name: "Кошмар", tier: 5, role: "base", hp: 107, ac: 15, attackBonus: 7, initiative: 12, attacks: [{ name: "Копита", type: "melee", dice: "3d8+6", damageType: "bludgeoning" }], abilities: [fearAura()] },
  { ...base, key: "demons-hell-nightmare", name: "Пекельний кошмар", tier: 5, role: "upgrade", hp: 119, ac: 16, attackBonus: 8, initiative: 12, attacks: [{ name: "Копита", type: "melee", dice: "3d8+7", damageType: "bludgeoning" }], abilities: [fearAura(), stun("Жахливий удар", 25)] },
  { ...base, key: "demons-gloom", name: "Морок", tier: 5, role: "alt", hp: 117, ac: 16, attackBonus: 8, initiative: 12, attacks: [{ name: "Копита", type: "melee", dice: "3d8+7", damageType: "bludgeoning" }], abilities: [fearAura(), fireImmunity(), finisher("Добивання", { type: "targetHasCondition", condition: "skip_action" }, { percent: 50 })] },
  { ...base, key: "demons-cave-demon", name: "Печерний демон", tier: 6, role: "base", hp: 132, ac: 16, attackBonus: 7, initiative: 8, attacks: [{ name: "Кам'яна лапа", type: "melee", dice: "3d8+9", damageType: "bludgeoning" }], abilities: [], spellKeys: ["fireball", "fire-wall"] },
  { ...base, key: "demons-cave-lord", name: "Печерний владика", tier: 6, role: "upgrade", hp: 148, ac: 17, attackBonus: 8, initiative: 8, attacks: [{ name: "Кам'яна лапа", type: "melee", dice: "3d8+11", damageType: "bludgeoning" }], abilities: [magicResist(25)], spellKeys: ["fireball", "fire-wall", "meteor-shower"] },
  { ...base, key: "demons-cave-abomination", name: "Печерний виродок", tier: 6, role: "alt", hp: 165, ac: 17, attackBonus: 8, initiative: 8, attacks: [{ name: "Кам'яна лапа", type: "melee", dice: "3d10+14", damageType: "bludgeoning" }], abilities: [critRange(18)] },
  { ...base, key: "demons-devil", name: "Диявол", tier: 7, role: "base", hp: 220, ac: 16, attackBonus: 8, initiative: 11, flying: true, attacks: [{ name: "Пекельний спис", type: "melee", dice: "4d10+16", damageType: "piercing" }], abilities: [magicResist(25)] },
  { ...base, key: "demons-archdevil", name: "Архидиявол", tier: 7, role: "upgrade", hp: 245, ac: 17, attackBonus: 9, initiative: 11, flying: true, attacks: [{ name: "Пекельний спис", type: "melee", dice: "4d10+20", damageType: "piercing" }], abilities: [magicResist(25), summonGroupOnce("Виклик пекла", "Демони", 6)] },
  { ...base, key: "demons-archdemon", name: "Архидемон", tier: 7, role: "alt", hp: 240, ac: 16, attackBonus: 9, initiative: 11, attacks: [{ name: "Пекельна сокира", type: "melee", dice: "4d10+18", damageType: "slashing" }], abilities: [magicResist(25), alliesAura("Полководець", { kind: "damageBonus", filter: { kind: "all" }, percent: 15 })] },
];
