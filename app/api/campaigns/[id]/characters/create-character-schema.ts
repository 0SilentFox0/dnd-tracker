import { z } from "zod";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { CharacterType } from "@/lib/constants/characters";

export const createCharacterSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum([CharacterType.PLAYER, CharacterType.NPC_HERO]),
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

  strength: z.number().min(1).max(30).default(10),
  dexterity: z.number().min(1).max(30).default(10),
  constitution: z.number().min(1).max(30).default(10),
  intelligence: z.number().min(1).max(30).default(10),
  wisdom: z.number().min(1).max(30).default(10),
  charisma: z.number().min(1).max(30).default(10),

  armorClass: z.number().min(0).default(10),
  initiative: z.number().default(0),
  speed: z.number().min(0).default(30),

  savingThrows: z.record(z.string(), z.boolean()).default({}),
  skills: z.record(z.string(), z.boolean()).default({}),

  spellcastingAbility: z
    .enum(["intelligence", "wisdom", "charisma"])
    .nullable()
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

  languages: z.array(z.string()).default([]),
  proficiencies: z.record(z.string(), z.array(z.string())).default({}),
  immunities: z.array(z.string()).default([]),
  morale: z.number().min(-3).max(3).default(0),


  // Уміння (персональний скіл з групи «Персональні»)
  personalSkillId: z.string().optional().nullable(),
  primaryAbility: z.enum(ABILITY_KEYS).nullable().optional(),
});
