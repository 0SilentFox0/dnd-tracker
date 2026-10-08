import { resolvedAbilitiesOf } from "./participants";

import type { FlagKey } from "@/lib/utils/abilities/schema";
import type { BattleParticipant } from "@/types/battle";

export const clampMorale = (v: number) => Math.max(-3, Math.min(3, v));

export function ownTimedMoraleFlat(p: BattleParticipant): number {
  let sum = 0;

  for (const ae of p.battleData.activeEffects) {
    for (const e of ae.abilityEffects ?? []) {
      if (e.kind === "modifyStat" && e.stat === "morale" && typeof e.flat === "number") sum += e.flat;
    }
  }

  return sum;
}

function ownMinMorale(p: BattleParticipant): number | undefined {
  const values = [
    ...resolvedAbilitiesOf(p).flatMap((a) => (a.trigger.event === "passive" ? a.effects : [])),
    ...p.battleData.activeEffects.flatMap((ae) => ae.abilityEffects ?? []),
  ].flatMap((e) => (e.kind === "flag" && e.flag === "minMorale" && (e.target ?? "self") === "self" ? [e.value] : []));

  return values.length ? Math.max(...values) : undefined;
}

// Лише власні прапорці без аур союзників: формули не можуть викликати collectModifiers (рекурсія).
function ownHasFlag(p: BattleParticipant, flag: FlagKey): boolean {
  const passive = resolvedAbilitiesOf(p).some(
    (a) => a.trigger.event === "passive" && a.effects.some((e) => e.kind === "flag" && e.flag === flag && (e.target ?? "self") === "self"),
  );

  return passive || p.battleData.activeEffects.some((ae) => (ae.abilityEffects ?? []).some((e) => e.kind === "flag" && e.flag === flag));
}

export function combineMorale(base: number, timedFlat: number, flags: { ignored: boolean; noNegative: boolean; min?: number }): { value: number; ignored: boolean } {
  if (flags.ignored) return { value: 0, ignored: true };

  const raw = clampMorale(base + timedFlat);

  const value = raw < 0 && flags.noNegative ? 0 : raw;

  return { value: flags.min === undefined ? value : Math.max(flags.min, value), ignored: false };
}

export function ownMorale(p: BattleParticipant): number {
  return combineMorale(p.combatStats.morale, ownTimedMoraleFlat(p), { ignored: ownHasFlag(p, "ignoreMorale"), noNegative: ownHasFlag(p, "noNegativeMorale"), min: ownMinMorale(p) }).value;
}
