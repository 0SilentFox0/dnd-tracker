import {
  CRITICAL_FAIL_EFFECTS,
  CRITICAL_SUCCESS_EFFECTS,
  type CriticalEffect,
  getCriticalEffect,
} from "@/lib/constants/critical-effects";
import { SAVE_FAIL_EFFECTS, SAVE_SUCCESS_EFFECTS } from "@/lib/constants/save-critical-effects";
import type { Rng } from "@/lib/utils/common/rng";

export type CritKind = "success" | "fail";

export type CritSource = "attack" | "save";

const TABLES: Record<CritSource, Record<CritKind, readonly CriticalEffect[]>> = {
  attack: { success: CRITICAL_SUCCESS_EFFECTS, fail: CRITICAL_FAIL_EFFECTS },
  save: { success: SAVE_SUCCESS_EFFECTS, fail: SAVE_FAIL_EFFECTS },
};

export const critEffectsFor = (source: CritSource, kind: CritKind): readonly CriticalEffect[] => TABLES[source][kind];

export const getCritEffect = (source: CritSource, kind: CritKind, id: number): CriticalEffect | undefined =>
  source === "attack" ? getCriticalEffect(id, kind) : TABLES.save[kind].find((e) => e.id === id);

export const randomCritEffect = (source: CritSource, kind: CritKind, rng: Rng): CriticalEffect => {
  const table = TABLES[source][kind];

  return table[Math.min(Math.floor(rng() * table.length), table.length - 1)];
};
