import type { LibraryUnit } from "../types";
import { bigShield,deathBlow, debuff, drainMana, enemiesRoundDamage, falloff, fearAura, incorporeal, lifeDrain, noRetaliation, raiseOnKill, stun, undead, undyingOnce } from "../unit-abilities";

import type { Ability } from "@/lib/utils/abilities/schema";

const base = { raceKey: "necromancers" } as const;

const boneBody = (): Ability => ({
  id: "unit-bone-body",
  name: "Кістяне тіло",
  description: "Опір колючій шкоді 50 %, вразливість до дробильної +25 %.",
  trigger: { event: "passive" },
  effects: [
    { kind: "flag", flag: "resistance", damageType: "piercing", percent: 50 },
    { kind: "flag", flag: "resistance", damageType: "bludgeoning", percent: -25 },
  ],
});

const rotAura = (): Ability => ({
  id: "unit-rot-aura",
  name: "Аура гнилі",
  description: "Вороги отримують −1 до атаки.",
  trigger: { event: "passive" },
  effects: [{ kind: "modifyStat", stat: "attackBonus", flat: -1, target: "allEnemies" }],
});

const fingerOfDeath = (): Ability => ({
  id: "unit-finger-of-death",
  name: "Палець смерті",
  description: "Дія, раз за бій: 150 % атаки без кидка по одному ворогу.",
  trigger: { event: "action" },
  limits: { perBattle: 1 },
  effects: [{ kind: "dealDamage", amount: { percentOf: "ownerAttack", value: 150 }, damageType: "necrotic", target: "eventTarget" }],
});

const wail = (): Ability => ({
  id: "unit-wail",
  name: "Виття",
  description: "Бонусна дія, раз за бій: вороги −2 до моралі на 2 раунди, кожен з шансом 25 % пропускає хід.",
  trigger: { event: "bonusAction" },
  limits: { perBattle: 1 },
  effects: [
    { kind: "modifyStat", stat: "morale", flat: -2, duration: { rounds: 2 }, target: "allEnemies" },
    { kind: "applyCondition", condition: "skip_action", duration: { rounds: 1 }, percent: 25, target: "allEnemies" },
  ],
});

const deathGaze = (): Ability => ({
  id: "unit-death-gaze",
  name: "Смертельний погляд",
  description: "Влучання з шансом 15 %: ціль втрачає 20 % максимального HP.",
  trigger: { event: "hit", role: "attacker" },
  limits: { chance: 15 },
  effects: [{ kind: "dealDamage", amount: { percentOf: "maxHp", value: 20 }, damageType: "necrotic", target: "eventTarget" }],
});

const skeleton = () => [undead(), boneBody()];

const zombie = () => [undead(), undyingOnce()];

const ghost = () => [undead(), incorporeal()];

const vampire = () => [undead(), noRetaliation()];

const lich = () => [undead(), falloff("Хмара смерті")];

export const NECROMANCER_UNITS: LibraryUnit[] = [
  { ...base, key: "necromancers-skeleton", name: "Скелет", tier: 1, role: "base", hp: 28, ac: 14, attackBonus: 5, initiative: 10, attacks: [{ name: "Іржавий меч", type: "melee", dice: "1d6", damageType: "slashing" }], abilities: skeleton() },
  { ...base, key: "necromancers-skeleton-archer", name: "Скелет-лучник", tier: 1, role: "upgrade", hp: 28, ac: 13, attackBonus: 6, initiative: 10, attacks: [{ name: "Кістяний лук", type: "ranged", dice: "1d6+1", damageType: "piercing" }], abilities: skeleton() },
  { ...base, key: "necromancers-skeleton-warrior", name: "Скелет-воїн", tier: 1, role: "alt", hp: 36, ac: 16, attackBonus: 6, initiative: 10, attacks: [{ name: "Старий меч", type: "melee", dice: "1d6+1", damageType: "slashing" }], abilities: [...skeleton(), bigShield(30)] },
  { ...base, key: "necromancers-zombie", name: "Зомбі", tier: 2, role: "base", hp: 48, ac: 10, attackBonus: 5, initiative: 6, attacks: [{ name: "Удар кулаками", type: "melee", dice: "1d6+1", damageType: "bludgeoning" }], abilities: zombie() },
  { ...base, key: "necromancers-plague-zombie", name: "Чумний зомбі", tier: 2, role: "upgrade", hp: 55, ac: 10, attackBonus: 6, initiative: 6, attacks: [{ name: "Заразні кігті", type: "melee", dice: "1d6+2", damageType: "slashing" }], abilities: [...zombie(), debuff("Чума", "attackBonus", 2, 2, 25)] },
  { ...base, key: "necromancers-rotting-zombie", name: "Гниючий зомбі", tier: 2, role: "alt", hp: 55, ac: 10, attackBonus: 6, initiative: 6, attacks: [{ name: "Гнилі кулаки", type: "melee", dice: "1d8+1", damageType: "bludgeoning" }], abilities: [...zombie(), rotAura()] },
  { ...base, key: "necromancers-ghost", name: "Привид", tier: 3, role: "base", hp: 49, ac: 12, attackBonus: 6, initiative: 10, attacks: [{ name: "Крижаний дотик", type: "melee", dice: "2d6+1", damageType: "necrotic" }], abilities: ghost(), flying: true },
  { ...base, key: "necromancers-ghost-warrior", name: "Привид-воїн", tier: 3, role: "upgrade", hp: 54, ac: 13, attackBonus: 7, initiative: 10, attacks: [{ name: "Примарний клинок", type: "melee", dice: "2d6+2", damageType: "necrotic" }], abilities: [...ghost(), drainMana()], flying: true },
  { ...base, key: "necromancers-arcane-ghost", name: "Магічний привид", tier: 3, role: "alt", hp: 52, ac: 13, attackBonus: 7, initiative: 11, attacks: [{ name: "Примарний промінь", type: "melee", dice: "2d6+2", damageType: "necrotic" }], abilities: [...ghost(), noRetaliation()], flying: true },
  { ...base, key: "necromancers-vampire", name: "Вампір", tier: 4, role: "base", hp: 77, ac: 15, attackBonus: 7, initiative: 11, attacks: [{ name: "Вампірячі кігті", type: "melee", dice: "2d6+5", damageType: "slashing" }], abilities: vampire() },
  { ...base, key: "necromancers-elder-vampire", name: "Вищий вампір", tier: 4, role: "upgrade", hp: 85, ac: 16, attackBonus: 8, initiative: 11, attacks: [{ name: "Вампірячі кігті", type: "melee", dice: "2d6+6", damageType: "slashing" }], abilities: [...vampire(), lifeDrain(50)] },
  { ...base, key: "necromancers-vampire-prince", name: "Принц-вампір", tier: 4, role: "alt", hp: 81, ac: 16, attackBonus: 8, initiative: 11, attacks: [{ name: "Вампірячі кігті", type: "melee", dice: "2d6+6", damageType: "slashing" }], abilities: [...vampire(), stun("Паралізація", 20)] },
  { ...base, key: "necromancers-lich", name: "Ліч", tier: 5, role: "base", hp: 90, ac: 14, attackBonus: 7, initiative: 10, attacks: [{ name: "Хмара смерті", type: "ranged", dice: "3d6+5", damageType: "necrotic", targets: 3 }], abilities: lich() },
  { ...base, key: "necromancers-archlich", name: "Архіліч", tier: 5, role: "upgrade", hp: 100, ac: 15, attackBonus: 8, initiative: 10, attacks: [{ name: "Хмара смерті", type: "ranged", dice: "3d6+7", damageType: "necrotic", targets: 3 }], abilities: lich(), spellKeys: ["frailty", "suffering"] },
  { ...base, key: "necromancers-high-lich", name: "Верховний ліч", tier: 5, role: "alt", hp: 98, ac: 15, attackBonus: 8, initiative: 10, attacks: [{ name: "Хмара смерті", type: "ranged", dice: "3d6+7", damageType: "necrotic", targets: 3 }], abilities: [...lich(), raiseOnKill("necromancers-skeleton")] },
  { ...base, key: "necromancers-wraith", name: "Умертвія", tier: 6, role: "base", hp: 154, ac: 16, attackBonus: 7, initiative: 11, attacks: [{ name: "Дотик смерті", type: "melee", dice: "3d8+9", damageType: "necrotic" }], abilities: [undead(), deathBlow("Смертельний дотик", 20)] },
  { ...base, key: "necromancers-death-herald", name: "Вісник смерті", tier: 6, role: "upgrade", hp: 171, ac: 17, attackBonus: 8, initiative: 11, attacks: [{ name: "Коса смерті", type: "melee", dice: "3d8+11", damageType: "necrotic" }], abilities: [undead(), deathBlow("Смертельний дотик", 20), fingerOfDeath()] },
  { ...base, key: "necromancers-banshee", name: "Баньші", tier: 6, role: "alt", hp: 165, ac: 16, attackBonus: 8, initiative: 12, attacks: [{ name: "Крижані кігті", type: "melee", dice: "3d8+11", damageType: "necrotic" }], abilities: [undead(), wail()], flying: true },
  { ...base, key: "necromancers-bone-dragon", name: "Костяний дракон", tier: 7, role: "base", hp: 220, ac: 15, attackBonus: 8, initiative: 10, attacks: [{ name: "Кістяні пазурі", type: "melee", dice: "4d10+16", damageType: "slashing" }], abilities: [undead(), fearAura()], flying: true },
  { ...base, key: "necromancers-sorrow-dragon", name: "Дракон скроботи", tier: 7, role: "upgrade", hp: 245, ac: 16, attackBonus: 9, initiative: 10, attacks: [{ name: "Пазурі скорботи", type: "melee", dice: "4d10+20", damageType: "necrotic" }], abilities: [undead(), fearAura(), deathGaze()], flying: true },
  { ...base, key: "necromancers-spectral-dragon", name: "Драко-привид", tier: 7, role: "alt", hp: 240, ac: 15, attackBonus: 9, initiative: 10, attacks: [{ name: "Примарні пазурі", type: "melee", dice: "4d10+18", damageType: "necrotic" }], abilities: [undead(), fearAura(), enemiesRoundDamage("Отруйна аура", 10)], flying: true },
];
