import { z } from "zod";

import { ABILITY_KEYS, SPELLCASTING_ABILITIES } from "@/lib/constants/abilities";

export const updateCharacterSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  level: z.number().min(1).max(30).optional(),
  class: z.string().min(1).optional(),
  subclass: z.string().nullable().optional(),
  race: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.string().min(1).optional(),
  ),
  subrace: z.string().nullable().optional(),
  alignment: z.string().nullable().optional(),
  background: z.string().max(20000).nullable().optional(),
  experience: z.number().min(0).optional(),
  avatar: z.string().nullable().optional(),

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

  // Saving Throws & Skills
  savingThrows: z.record(z.string(), z.boolean()).optional(),
  skills: z.record(z.string(), z.boolean()).optional(),

  // Заклинання
  spellcastingAbility: z.preprocess(
    (v) => (v === "" ? null : v),
    z.enum(SPELLCASTING_ABILITIES).nullable().optional(),
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

  // Прокачка
  controlledBy: z.string().optional(),

  // Уміння (персональний скіл)
  personalSkillId: z.string().optional().nullable(),

  primaryAbility: z.enum(ABILITY_KEYS).nullable().optional(),

  // Коефіцієнти масштабування (HP, melee, ranged) — окремі для кожного героя
  hpMultiplier: z.number().min(0.1).max(3).optional(),
  meleeMultiplier: z.number().min(0.1).max(3).optional(),
  rangedMultiplier: z.number().min(0.1).max(3).optional(),
});
