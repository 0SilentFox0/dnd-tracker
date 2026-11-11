import type { Characteristics } from "./characteristics/keys";
import type { SheetWfrpBlock } from "./characteristics/sheet-block";
import type { WfrpParticipantStats } from "./combat/participant";
import { qualityList } from "./equipment/guard";
import type { QualityRef } from "./equipment/qualities";
import type { PercentileAttackDetails, PercentileCastDetails } from "./percentile/details";

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

export interface WfrpParticipantSlot {
  characteristics: Characteristics;
  stats: WfrpParticipantStats;
}

export const PARTICIPANT_SLOT = defineSlot<WfrpParticipantSlot>("wfrp", (raw) => (isRec(raw) && isRec(raw.characteristics) && isRec(raw.stats) ? (raw as unknown as WfrpParticipantSlot) : undefined));

export const SHEET_SLOT = defineSlot<SheetWfrpBlock>("wfrp", (raw) => (isRec(raw) ? (raw as unknown as SheetWfrpBlock) : undefined));

export interface WfrpActionSlot {
  attack?: PercentileAttackDetails;
  cast?: PercentileCastDetails;
}

export const ACTION_SLOT = defineSlot<WfrpActionSlot>("wfrp", (raw) => {
  if (!isRec(raw)) return undefined;

  const attack = isRec(raw.attack) ? (raw.attack as unknown as PercentileAttackDetails) : undefined;

  const cast = isRec(raw.cast) ? (raw.cast as unknown as PercentileCastDetails) : undefined;

  return attack || cast ? { ...(attack && { attack }), ...(cast && { cast }) } : undefined;
});
