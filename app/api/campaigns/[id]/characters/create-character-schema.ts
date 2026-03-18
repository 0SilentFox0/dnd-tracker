import { z } from "zod";

export const createCharacterSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["player", "npc_hero"]),
  controlledBy: z.string(),
  level: z.number().min(1).max(30).default(1),
  class: z.string().min(1),
  subclass: z.string().optional(),
  race: z.string().min(1),
  subrace: z.string().optional(),
  alignment: z.string().optional(),
  background: z.string().optional(),
  experience: z.number().min(0).default(0),
  avatar: z.string().optional(),

  // Ability Scores
  strength: z.number().min(1).max(30).default(10),
  dexterity: z.number().min(1).max(30).default(10),
  constitution: z.number().min(1).max(30).default(10),
  intelligence: z.number().min(1).max(30).default(10),
  wisdom: z.number().min(1).max(30).default(10),
  charisma: z.number().min(1).max(30).default(10),

  // Бойові параметри
  armorClass: z.number().min(0).default(10),
  initiative: z.number().default(0),
  speed: z.number().min(0).default(30),
  maxHp: z.number().min(1).default(10),
  currentHp: z.number().min(0).default(10),
  tempHp: z.number().min(0).default(0),
  hitDice: z.string().default("1d8"),

  // Saving Throws & Skills
  savingThrows: z.record(z.string(), z.boolean()).default({}),
  skills: z.record(z.string(), z.boolean()).default({}),

  // Заклинання
  spellcastingClass: z.string().optional(),
  spellcastingAbility: z
    .enum(["intelligence", "wisdom", "charisma"])
    .optional(),
  spellSlots: z
    .record(
      z.string(),
      z.object({
        max: z.number(),
        current: z.number(),
      }),
    )
    .default({}),
  knownSpells: z.array(z.string()).default([]),

  // Інше
  languages: z.array(z.string()).default([]),
  proficiencies: z.record(z.string(), z.array(z.string())).default({}),
  immunities: z.array(z.string()).default([]),
  morale: z.number().min(-3).max(3).default(0),

  // Roleplay
  personalityTraits: z.string().optional(),
  ideals: z.string().optional(),
  bonds: z.string().optional(),
  flaws: z.string().optional(),

  // Уміння (персональний скіл з групи «Персональні»)
  personalSkillId: z.string().optional().nullable(),
});
