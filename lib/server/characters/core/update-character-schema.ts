import { z } from "zod";

import { ABILITY_KEYS, SPELLCASTING_ABILITIES } from "@/lib/constants/abilities";
import { HERO_INITIATIVE_BOUNDS } from "@/lib/constants/characters";
import { HERO_ARCHETYPE_KEYS } from "@/lib/constants/hero-archetypes";
import { BackgroundSelectionFields } from "@/lib/schemas/choices";
import { CharacterClassesSchema } from "@/lib/schemas/classes";

export const updateCharacterSchema = z.object({
  ...BackgroundSelectionFields,
  name: z.string().min(1).max(100).optional(),
  level: z.number().min(1).max(30).optional(),
  class: z.string().optional(),
  subclass: z.string().nullable().optional(),
  classes: CharacterClassesSchema.optional(),
  race: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.string().min(1).optional(),
  ),
  subrace: z.string().nullable().optional(),
  alignment: z.string().nullable().optional(),
  background: z.string().max(20000).nullable().optional(),
  avatar: z.string().nullable().optional(),

  strength: z.number().min(1).max(30).optional(),
  dexterity: z.number().min(1).max(30).optional(),
  constitution: z.number().min(1).max(30).optional(),
  intelligence: z.number().min(1).max(30).optional(),
  wisdom: z.number().min(1).max(30).optional(),
  charisma: z.number().min(1).max(30).optional(),

  armorClass: z.number().min(0).optional(),
  initiative: z.number().int().min(HERO_INITIATIVE_BOUNDS.MIN).max(HERO_INITIATIVE_BOUNDS.MAX).optional(),
  speed: z.number().min(0).optional(),

  savingThrows: z.record(z.string(), z.boolean()).optional(),
  skills: z.record(z.string(), z.boolean()).optional(),

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

  languages: z.array(z.string()).optional(),
  proficiencies: z.record(z.string(), z.array(z.string())).optional(),
  immunities: z.array(z.string()).optional(),
  morale: z.number().min(-10).max(10).optional(),

  // Прокачка
  controlledBy: z.string().optional(),

  // Уміння (персональний скіл)
  personalSkillId: z.string().optional().nullable(),

  primaryAbility: z.enum(ABILITY_KEYS).nullable().optional(),

  archetype: z.enum(HERO_ARCHETYPE_KEYS).nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.class === "" && !value.classes?.length) ctx.addIssue({ code: "custom", path: ["class"], message: "Required" });
});
