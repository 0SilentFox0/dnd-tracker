import type { SpellCost, SpellResolution, SpellTargeting } from "./schema";

import { ABILITY_LABELS } from "@/lib/constants/abilities";
import { SPELL_COST_LABELS, SPELL_SAVE_ON_SUCCESS_LABELS, SPELL_TARGETING_LABELS, TEMPLATE_SHAPE_LABELS } from "@/lib/constants/spells";

const inline = (label: string) => label.replace(/^Один /, "").toLowerCase();

export function targetingLabel(t: SpellTargeting): string {
  if (t.kind === "area") return `до ${t.maxTargets} ${t.side === "enemy" ? "ворогів" : "союзників"}`;

  if (t.kind === "template") return `${t.hollow && t.shape === "circle" ? "Кільце" : TEMPLATE_SHAPE_LABELS[t.shape]} ${t.size} фт`;

  return inline(SPELL_TARGETING_LABELS[t.kind]);
}

export function resolutionLabel(r: SpellResolution): string {
  return r.kind === "auto" ? "автоматично" : `рятівний кидок ${ABILITY_LABELS[r.ability]} (${inline(SPELL_SAVE_ON_SUCCESS_LABELS[r.onSuccess])})`;
}

export const costLabel = (c: SpellCost): string => inline(SPELL_COST_LABELS[c]);
