import { z } from "zod";

import type { SpellFx } from "./spells";
import { FX_ARCHETYPES, FX_AURA_KINDS, FX_ELEMENTS } from "./types";

export const SpellFxSchema = z.strictObject({
  archetype: z.enum(FX_ARCHETYPES).optional(),
  element: z.enum(FX_ELEMENTS).optional(),
  aura: z.enum(FX_AURA_KINDS).optional(),
});

export function parseSpellFx(raw: unknown): SpellFx | null {
  const parsed = SpellFxSchema.safeParse(raw);

  return parsed.success ? parsed.data : null;
}
