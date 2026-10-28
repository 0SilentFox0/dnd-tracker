import { z } from "zod";

import { MAX_EXHAUSTION } from "@/lib/utils/battle/conditions/query";
import type { CharacterResources } from "@/types/characters";

const count = z.number().int().min(0).max(999);

const shape = {
  hp: z.number().int().min(0).optional(),
  tempHp: z.number().int().min(0).optional(),
  dead: z.boolean().optional(),
  slotsSpent: z.record(z.string().regex(/^([1-9]|pact)$/), count).optional(),
  hitDiceSpent: z.record(z.string().min(1).max(100), count).optional(),
  charges: z.record(z.string().min(1).max(300), z.object({ used: count, rest: z.enum(["short", "long"]).nullable() })).optional(),
  exhaustion: z.number().int().min(0).max(MAX_EXHAUSTION).optional(),
  shortRestOpen: z.boolean().optional(),
};

export const CharacterResourcesSchema: z.ZodType<CharacterResources> = z.object(shape);

export function readResources(raw: unknown): CharacterResources {
  const whole = CharacterResourcesSchema.safeParse(raw ?? {});

  if (whole.success) return whole.data;

  if (typeof raw !== "object" || raw === null) return {};

  const kept = Object.entries(shape).flatMap(([key, field]) => {
    const parsed = field.safeParse((raw as Record<string, unknown>)[key]);

    return parsed.success && parsed.data !== undefined ? [[key, parsed.data] as const] : [];
  });

  return Object.fromEntries(kept) as CharacterResources;
}
