/**
 * Константи даних для seed-mock-battle-data (заклинання, основні скіли, скіли рас)
 */

type SpellSeedItem = {
  name: string;
  level: number;
  type: string;
  target: string;
  damageType: string;
  damageElement?: string;
  damageModifier?: string;
  diceCount: number;
  diceType: string;
  savingThrow?: { ability: string; onSuccess: string };
  description: string;
  concentration: boolean;
};

export const SPELLS_DATA: SpellSeedItem[] = [
  {
    name: "Fireball",
    level: 3,
    type: "aoe",
    target: "enemies",
    damageType: "damage",
    damageElement: "fire",
    diceCount: 8,
    diceType: "d6",
    savingThrow: {
      ability: "dexterity",
      onSuccess: "half",
    },
    description: "Вибух вогню, що вражає всіх ворогів в радіусі",
    concentration: false,
  },
  {
    name: "Heal",
    level: 3,
    type: "target",
    target: "allies",
    damageType: "heal",
    diceCount: 4,
    diceType: "d8",
    description: "Лікує союзника",
    concentration: false,
  },
  {
    name: "Magic Missile",
    level: 1,
    type: "target",
    target: "enemies",
    damageType: "damage",
    damageElement: "force",
    diceCount: 3,
    diceType: "d4",
    description: "Три магічні стріли, що завжди попадають",
    concentration: false,
  },
  {
    name: "Cure Wounds",
    level: 1,
    type: "target",
    target: "allies",
    damageType: "heal",
    diceCount: 1,
    diceType: "d8",
    description: "Базове лікування",
    concentration: false,
  },
  {
    name: "Poison Spray",
    level: 0,
    type: "target",
    target: "enemies",
    damageType: "damage",
    damageElement: "poison",
    damageModifier: "poison",
    diceCount: 1,
    diceType: "d12",
    savingThrow: {
      ability: "constitution",
      onSuccess: "none",
    },
    description: "Отруйний спрей з DOT ефектом",
    concentration: false,
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
      bonuses: { melee_damage_percent: 15 },
      mainSkillId: mainSkillIds[0].id,
    },
    {
      name: "Просунута Атака",
      description: "+10% до урону ближньою зброєю",
      bonuses: { melee_damage_percent: 10 },
      mainSkillId: mainSkillIds[0].id,
    },
    {
      name: "Базовий Захист",
      description: "+2 до AC",
      bonuses: { ac_bonus: 2 },
      mainSkillId: mainSkillIds[2].id,
    },
    {
      name: "Базове Заклинання",
      description: "+10% до ефекту заклинань",
      bonuses: {},
      spellEffectIncrease: 10,
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
      bonuses: { ranged_attack_advantage: true },
      mainSkillId: mainSkillIds[0].id,
    },
    {
      name: "Магічна Стрільба",
      description: "+20% до урону дальньою зброєю",
      bonuses: { ranged_damage_percent: 20 },
      mainSkillId: mainSkillIds[0].id,
    },
    {
      name: "Покращене Заклинання",
      description: "+25% до ефекту заклинань",
      spellEffectIncrease: 25,
      mainSkillId: mainSkillIds[1].id,
    },
    {
      name: "Отруйна Стріла",
      description: "Додає отруту до заклинання",
      spellId: spells[4].id,
      spellAdditionalModifier: {
        modifier: "poison",
        damageDice: "1d6",
        duration: 3,
      },
      mainSkillId: mainSkillIds[1].id,
    },
  ];
}
