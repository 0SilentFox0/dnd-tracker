import { z } from "zod";

export const CHARACTERISTIC_KEYS = ["ws", "bs", "s", "t", "i", "ag", "dex", "int", "wp", "fel"] as const;

export type CharacteristicKey = (typeof CHARACTERISTIC_KEYS)[number];

export const SKILL_ADVANCE_KEY_RE = /^[a-z][a-z0-9-]{0,39}(:[a-z0-9-]{1,40})?$/;

const perKey = (min: number, max: number, fill: number) =>
  z.record(z.enum(CHARACTERISTIC_KEYS), z.number().int().min(min).max(max)).default(() => Object.fromEntries(CHARACTERISTIC_KEYS.map((k) => [k, fill])) as Record<CharacteristicKey, number>);

export const CharacteristicsSchema = z.object({
  base: perKey(1, 100, 30),
  advances: perKey(0, 100, 0),
  move: z.number().int().min(1).max(12).default(4),
  skillAdvances: z.record(z.string().regex(SKILL_ADVANCE_KEY_RE), z.number().int().min(0).max(100)).default({}),
  fate: z.number().int().min(0).max(9).default(0),
  extraWounds: z.number().int().min(0).max(3).default(0),
});

export type Characteristics = z.infer<typeof CharacteristicsSchema>;

export const DEFAULT_CHARACTERISTICS: Characteristics = CharacteristicsSchema.parse({});
