import { resolveFlat } from "@/lib/utils/abilities/engine/core/amount";
import type { BattleParticipant } from "@/types/battle";

const isFormula = (v: unknown): v is { formula: string } => !!v && typeof v === "object" && typeof (v as { formula?: unknown }).formula === "string";

/** Після запікання: perRest.uses { formula } → число (мінімум 1) від запечених модифікаторів. */
export function resolveLimitFormulas(p: BattleParticipant): BattleParticipant {
  const list = p.battleData.resolvedAbilities;

  if (!list.some((a) => isFormula(a.limits?.perRest?.uses))) return p;

  return {
    ...p,
    battleData: {
      ...p.battleData,
      resolvedAbilities: list.map((a) => {
        const perRest = a.limits?.perRest;

        return a.limits && perRest && isFormula(perRest.uses) ? { ...a, limits: { ...a.limits, perRest: { ...perRest, uses: Math.max(1, resolveFlat(perRest.uses, p)) } } } : a;
      }),
    },
  };
}
