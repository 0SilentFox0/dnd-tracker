import { resolveFlat } from "@/lib/utils/abilities/engine/core/amount";
import type { BattleParticipant } from "@/types/battle";
import type { CharacterResources } from "@/types/characters";

export interface ArcaneRecoveryOffer {
  key: string;
  budget: number;
  maxSlotLevel: number;
  used: boolean;
  slots: { level: number; spent: number }[];
}

export type ArcaneRecoveryPicks = Record<string, number>;

export type ArcaneRecoveryFailure = "used" | "empty" | "level" | "notSpent" | "budget";

export type ArcaneRecoveryResult = { ok: true; resources: CharacterResources } | { ok: false; reason: ArcaneRecoveryFailure };

export function arcaneRecoveryOffer(p: BattleParticipant, r: Pick<CharacterResources, "slotsSpent" | "charges">): ArcaneRecoveryOffer | null {
  for (const a of p.battleData.resolvedAbilities) {
    const effect = a.effects.find((e) => e.kind === "restoreSpellSlotLevels");

    if (effect?.kind !== "restoreSpellSlotLevels") continue;

    const max = effect.maxSlotLevel;

    const slots = Object.entries(r.slotsSpent ?? {})
      .filter(([k, n]) => /^\d+$/.test(k) && Number(k) <= max && n > 0)
      .map(([k, n]) => ({ level: Number(k), spent: n }))
      .sort((x, y) => x.level - y.level);

    return { key: a.key, budget: Math.max(0, resolveFlat(effect.budget, p)), maxSlotLevel: max, used: (r.charges?.[a.key]?.used ?? 0) > 0, slots };
  }

  return null;
}

export function applyArcaneRecovery(r: CharacterResources, offer: ArcaneRecoveryOffer, picks: ArcaneRecoveryPicks): ArcaneRecoveryResult {
  if (offer.used) return { ok: false, reason: "used" };

  const entries = Object.entries(picks).filter(([, n]) => n > 0);

  if (entries.length === 0) return { ok: false, reason: "empty" };

  if (entries.some(([k, n]) => !/^\d+$/.test(k) || Number(k) < 1 || Number(k) > offer.maxSlotLevel || !Number.isInteger(n))) return { ok: false, reason: "level" };

  const spent = r.slotsSpent ?? {};

  if (entries.some(([k, n]) => n > (spent[k] ?? 0))) return { ok: false, reason: "notSpent" };

  if (entries.reduce((sum, [k, n]) => sum + Number(k) * n, 0) > offer.budget) return { ok: false, reason: "budget" };

  const slotsSpent = { ...spent };

  for (const [k, n] of entries) {
    if (slotsSpent[k] - n > 0) slotsSpent[k] -= n;
    else delete slotsSpent[k];
  }

  return { ok: true, resources: { ...r, slotsSpent, charges: { ...r.charges, [offer.key]: { used: 1, rest: "long" } } } };
}

export const pickedLevels = (picks: ArcaneRecoveryPicks): number => Object.entries(picks).reduce((sum, [k, n]) => sum + Number(k) * n, 0);
