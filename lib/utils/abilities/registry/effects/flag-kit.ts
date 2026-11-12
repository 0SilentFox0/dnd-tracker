import type { FieldMeta } from "../fields";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { PROFICIENCY_KINDS } from "@/lib/constants/artifacts";
import { DND_SKILLS } from "@/lib/constants/skills";
import type { FlagEffect, FlagKey } from "@/lib/utils/abilities/schema";
import { seg, type Segment, type SegmentParam } from "@/lib/utils/abilities/segments";

export type FlagOf<K extends FlagKey> = Extract<FlagEffect, { flag: K }>;

export interface FlagDefinition<K extends FlagKey> {
  fields: readonly FieldMeta[];
  defaults: Record<string, unknown>;
  describe: (e: FlagOf<K>) => Segment[];
}

export const flagSeg = (key: FlagKey, params?: Record<string, SegmentParam>) => seg(`summary.flags.${key}`, params);

export const plain = (key: FlagKey) => ({ fields: [] as readonly FieldMeta[], defaults: {} as Record<string, unknown>, describe: () => [flagSeg(key)] });

export const ABILITY_OPTIONS = ABILITY_KEYS.map((value) => ({ value }));

export const SKILL_OPTIONS = DND_SKILLS.map((value) => ({ value }));

export const PROFICIENCY_OPTIONS = PROFICIENCY_KINDS.map((value) => ({ value }));

export const listParams = (group: string, a: readonly string[] | "all") => ({
  hasList: a === "all" ? "no" : "yes",
  ...(a !== "all" && { list: { join: ", ", items: a.map((k) => seg(`options.${group}.${k}`)) } }),
});
