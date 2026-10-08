/**
 * Константи даних для seed-mock-battle-data (заклинання, основні скіли, скіли рас)
 */

type SpellSeedItem = {
  name: string;
  level: number;
  description: string;
  dice: number;
  targeting: unknown;
  resolution: unknown;
  spellEffects: unknown[];
};

const fire = (damageType: string, extra: object = {}) => ({ kind: "dealDamage", amount: { spellRoll: 100 }, damageType, ...extra });

export const SPELLS_DATA: SpellSeedItem[] = [
  {
    name: "Fireball",
    level: 3,
    dice: 4,
    targeting: { kind: "area", side: "enemy", maxTargets: 4 },
    resolution: { kind: "save", ability: "dexterity", onSuccess: "half" },
    spellEffects: [fire("fire")],
    description: "Вибух вогню, що вражає до чотирьох ворогів",
  },
  {
    name: "Heal",
    level: 3,
    dice: 2,
    targeting: { kind: "ally" },
    resolution: { kind: "auto" },
    spellEffects: [{ kind: "heal", amount: { spellRoll: 100 } }],
    description: "Лікує союзника",
  },
  {
    name: "Magic Missile",
    level: 1,
    dice: 1,
    targeting: { kind: "enemy" },
    resolution: { kind: "auto" },
    spellEffects: [fire("force")],
    description: "Магічна стріла, що завжди влучає",
  },
  {
    name: "Cure Wounds",
    level: 1,
    dice: 1,
    targeting: { kind: "ally" },
    resolution: { kind: "auto" },
    spellEffects: [{ kind: "heal", amount: { spellRoll: 100 } }],
    description: "Базове лікування",
  },
  {
    name: "Poison Spray",
    level: 1,
    dice: 1,
    targeting: { kind: "enemy" },
    resolution: { kind: "save", ability: "constitution", onSuccess: "none" },
    spellEffects: [{ kind: "dot", damagePerRound: { spellRoll: 50 }, damageType: "poison", duration: { rounds: 3 } }],
    description: "Отруйний спрей з DOT ефектом",
  },
];

export const MAIN_SKILLS_DATA = [
  { name: "Бойова Майстерність", color: "#ef4444", icon: "⚔️" },
  { name: "Магія", color: "#8b5cf6", icon: "✨" },
  { name: "Захист", color: "#3b82f6", icon: "🛡️" },
  { name: "Швидкість", color: "#10b981", icon: "💨" },
] as const;

export function getHumanSkillsData(mainSkillIds: { id: string }[]) {
  return [
    {
      name: "Базова Атака",
      description: "+15% до урону ближньою зброєю",
      abilities: [{ id: "a1", name: "Базова Атака", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 15 }] }],
      mainSkillId: mainSkillIds[0].id,
    },
    {
      name: "Просунута Атака",
      description: "+10% до урону ближньою зброєю",
      abilities: [{ id: "a1", name: "Просунута Атака", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }] }],
      mainSkillId: mainSkillIds[0].id,
    },
    {
      name: "Базовий Захист",
      description: "+2 до AC",
      abilities: [{ id: "a1", name: "Базовий Захист", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 2 }] }],
      mainSkillId: mainSkillIds[2].id,
    },
    {
      name: "Базове Заклинання",
      description: "+10% до шкоди заклинань",
      abilities: [{ id: "a1", name: "Базове Заклинання", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "magic" }, percent: 10 }] }],
      mainSkillId: mainSkillIds[1].id,
    },
  ];
}

export function getElfSkillsData(
  mainSkillIds: { id: string }[],
  spells: { id: string }[],
) {
  return [
    {
      name: "Ельфійська Точність",
      description: "Advantage на дальні атаки",
      abilities: [{ id: "a1", name: "Ельфійська Точність", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "advantage", attackKind: "ranged" }] }],
      mainSkillId: mainSkillIds[0].id,
    },
    {
      name: "Магічна Стрільба",
      description: "+20% до урону дальньою зброєю",
      abilities: [{ id: "a1", name: "Магічна Стрільба", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "ranged" }, percent: 20 }] }],
      mainSkillId: mainSkillIds[0].id,
    },
    {
      name: "Покращене Заклинання",
      description: "+25% до шкоди заклинань",
      abilities: [{ id: "a1", name: "Покращене Заклинання", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "magic" }, percent: 25 }] }],
      mainSkillId: mainSkillIds[1].id,
    },
    {
      name: "Отруйна Стріла",
      description: "Отруйна стріла",
      abilities: [],
      spellId: spells[4].id,
      mainSkillId: mainSkillIds[1].id,
    },
  ];
}
