import { qualityList } from "./equipment/guard";
import type { QualityRef } from "./equipment/qualities";

import { defineSlot } from "@/lib/utils/rules/systems/slot";

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export interface WfrpAttackSlot {
  qualities: QualityRef[];
  flaws: QualityRef[];
  noSb?: boolean;
  magical?: true;
}

export const ATTACK_SLOT = defineSlot<WfrpAttackSlot>("wfrp", (raw) => {
  if (!isRec(raw)) return undefined;

  const qualities = qualityList(raw.qualities);

  const flaws = qualityList(raw.flaws);

  if (!qualities || !flaws) return undefined;

  return { qualities, flaws, ...(raw.noSb === true && { noSb: true }), ...(raw.magical === true && { magical: true as const }) };
});
