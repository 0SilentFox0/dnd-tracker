import { z } from "zod";

import { QUALITY_VALUE_MAX } from "./constants";

type Entry = { kind: "quality" | "flaw"; hasValue: boolean; implemented: boolean };

const q = (hasValue = false, implemented = true): Entry => ({ kind: "quality", hasValue, implemented });

const f = (hasValue = false, implemented = true): Entry => ({ kind: "flaw", hasValue, implemented });

// verify against 5e book
export const QUALITY_REGISTRY = {
  damaging: q(),
  impale: q(),
  penetrating: q(),
  hack: q(),
  pummel: q(),
  precise: q(),
  accurate: q(),
  blast: q(true),
  pistol: q(),
  shield: q(true),
  defensive: q(),
  fast: q(),
  flexible: q(),
  distract: q(true, false),
  entangle: q(true, false),
  wrap: q(false, false),
  spread: q(false, false),
  trapBlade: q(false, false),
  unbreakable: q(false, false),
  inflict: q(true, false),
  repeater: q(true, false),
  imprecise: f(),
  undamaging: f(),
  unreliable: f(),
  dangerous: f(),
  slow: f(),
  reload: f(true),
} as const satisfies Record<string, Entry>;

export type QualityKey = keyof typeof QUALITY_REGISTRY;

export const QUALITY_KEYS = Object.keys(QUALITY_REGISTRY) as [QualityKey, ...QualityKey[]];

export type QualityRef = { key: QualityKey; value?: number };

export const QualityRefSchema: z.ZodType<QualityRef> = z
  .strictObject({ key: z.enum(QUALITY_KEYS), value: z.number().int().min(1).max(QUALITY_VALUE_MAX).optional() })
  .refine((r) => QUALITY_REGISTRY[r.key].hasValue === (r.value !== undefined), { message: "quality value mismatch", path: ["value"] });

export const qualityValue = (list: readonly QualityRef[], key: QualityKey): number | undefined => list.find((r) => r.key === key)?.value;

export const hasQuality = (list: readonly QualityRef[], key: QualityKey): boolean => list.some((r) => r.key === key);
