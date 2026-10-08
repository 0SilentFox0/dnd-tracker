import type { SpellCost, SpellResolution, SpellTargeting } from "./schema";

import { ABILITY_LABELS } from "@/lib/constants/abilities";

export function targetingLabel(t: SpellTargeting): string {
  switch (t.kind) {
    case "self":
      return "заклинатель";
    case "ally":
      return "союзник";
    case "enemy":
      return "ворог";
    case "allyDead":
      return "полеглий союзник";
    case "area":
      return `до ${t.maxTargets} ${t.side === "enemy" ? "ворогів" : "союзників"}`;
    case "allAllies":
      return "усі союзники";
    case "allEnemies":
      return "усі вороги";
    case "everyone":
      return "усі учасники";
  }
}

export function resolutionLabel(r: SpellResolution): string {
  return r.kind === "auto" ? "автоматично" : `рятівний кидок ${ABILITY_LABELS[r.ability]} (${r.onSuccess === "half" ? "половина шкоди" : "без ефекту"})`;
}

export const costLabel = (c: SpellCost): string => (c === "bonusAction" ? "бонусна дія" : "дія");
