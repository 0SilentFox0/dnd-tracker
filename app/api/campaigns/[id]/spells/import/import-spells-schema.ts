import { z } from "zod";

import { ABILITY_KEYS } from "@/lib/constants/abilities";

const TRUTHY_CONCENTRATION = new Set(["true", "yes", "1", "так"]);

const importSpellSchema = z.object({
  name: z.string().min(1),
  level: z.number().min(0).max(9).default(0),
  school: z.string().optional(),
  type: z.enum(["target", "aoe"]).default("target"),
  damageType: z.enum(["damage", "heal"]).default("damage"),
  damageElement: z.string().optional(),
  castingTime: z.string().optional(),
  range: z.string().optional(),
  components: z.string().optional(),
  duration: z.string().optional(),
  concentration: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === "boolean") return val;

      return typeof val === "string" && TRUTHY_CONCENTRATION.has(val.toLowerCase());
    }),
  damageDice: z.string().optional(),
  savingThrowAbility: z.enum(ABILITY_KEYS).optional(),
  savingThrowOnSuccess: z.enum(["half", "none"]).optional(),
  description: z.string().min(1),
  groupId: z.string().optional(),
  icon: z.string().optional().nullable(),
});

export const importSpellsSchema = z.object({
  spells: z.array(importSpellSchema),
  groupId: z.string().optional(),
});

export type ImportedSpell = z.infer<typeof importSpellSchema>;
