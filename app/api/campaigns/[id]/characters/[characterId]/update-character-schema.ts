import { z } from "zod";

export const updateCharacterSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  level: z.number().min(1).max(30).optional(),
  class: z.string().min(1).optional(),
  subclass: z.string().optional(),
  race: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.string().min(1).optional(),
  ),
  subrace: z.string().optional(),
  alignment: z.string().optional(),
  background: z.string().optional(),
  experience: z.number().min(0).optional(),
  avatar: z.string().optional(),

  // Ability Scores
  strength: z.number().min(1).max(30).optional(),
  dexterity: z.number().min(1).max(30).optional(),
  constitution: z.number().min(1).max(30).optional(),
  intelligence: z.number().min(1).max(30).optional(),
  wisdom: z.number().min(1).max(30).optional(),
  charisma: z.number().min(1).max(30).optional(),

  // Бойові параметри
  armorClass: z.number().min(0).optional(),
  initiative: z.number().optional(),
  speed: z.number().min(0).optional(),
  maxHp: z.number().min(1).optional(),
  currentHp: z.number().min(0).optional(),
  tempHp: z.number().min(0).optional(),
  hitDice: z.string().optional(),

  // Saving Throws & Skills
  savingThrows: z.record(z.string(), z.boolean()).optional(),
  skills: z.record(z.string(), z.boolean()).optional(),

  // Заклинання
  spellcastingClass: z.string().optional(),
  spellcastingAbility: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.enum(["intelligence", "wisdom", "charisma"]).optional(),
  ),
  spellSlots: z
    .record(
      z.string(),
      z.object({
        max: z.number(),
        current: z.number(),
      }),
    )
    .optional(),
  knownSpells: z.array(z.string()).optional(),

  // Інше
  languages: z.array(z.string()).optional(),
  proficiencies: z.record(z.string(), z.array(z.string())).optional(),
  immunities: z.array(z.string()).optional(),
  morale: z.number().min(-3).max(3).optional(),

  // Roleplay
  personalityTraits: z.string().optional(),
  ideals: z.string().optional(),
  bonds: z.string().optional(),
  flaws: z.string().optional(),

  // Прокачка
  controlledBy: z.string().optional(),

  // Уміння (персональний скіл)
  personalSkillId: z.string().optional().nullable(),

  // Прогрес по деревах прокачки
  skillTreeProgress: z
    .record(
      z.string(),
      z.object({
        level: z.string().optional(),
        unlockedSkills: z.array(z.string()).optional(),
      }),
    )
    .optional(),

  // Коефіцієнти масштабування (HP, melee, ranged) — окремі для кожного героя
  hpMultiplier: z.number().min(0.1).max(3).optional(),
  meleeMultiplier: z.number().min(0.1).max(3).optional(),
  rangedMultiplier: z.number().min(0.1).max(3).optional(),
});
