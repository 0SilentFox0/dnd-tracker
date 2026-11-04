import { z } from "zod";

import { CHARACTERISTIC_KEYS, type CharacteristicKey, SKILL_ADVANCE_KEY_RE } from "./keys";

export { CHARACTERISTIC_KEYS, type CharacteristicKey, type Characteristics, DEFAULT_CHARACTERISTICS, readCharacteristics, SKILL_ADVANCE_KEY_RE, SKILL_KEY_RE, SPEC_RE } from "./keys";

const perKey = (min: number, max: number, fill: number) =>
  z
    .partialRecord(z.enum(CHARACTERISTIC_KEYS), z.number().int().min(min).max(max))
    .default({})
    .transform((partial) => ({ ...Object.fromEntries(CHARACTERISTIC_KEYS.map((k) => [k, fill])), ...partial }) as Record<CharacteristicKey, number>);

export const CharacteristicsSchema = z.object({
  base: perKey(1, 100, 30),
  advances: perKey(0, 100, 0),
  move: z.number().int().min(1).max(12).default(4),
  skillAdvances: z.record(z.string().regex(SKILL_ADVANCE_KEY_RE), z.number().int().min(0).max(100)).default({}),
  fate: z.number().int().min(0).max(9).default(0),
  extraWounds: z.number().int().min(0).max(3).default(0),
});
