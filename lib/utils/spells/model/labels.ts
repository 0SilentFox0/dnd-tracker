/* eslint-disable no-restricted-syntax -- uk facet strings of the cached info reference (stored as plain strings in the cache and used as filter values) */
import type { SpellCost, SpellResolution, SpellTargeting } from "./schema";

import { ABILITY_LABELS } from "@/lib/constants/abilities";
import { SPELL_COST_LABELS, SPELL_SAVE_ON_SUCCESS_LABELS, SPELL_TARGETING_LABELS, TEMPLATE_SHAPE_LABELS } from "@/lib/constants/spells";
import { dynamicTextRef, textRef } from "@/lib/i18n/text-ref";
import type { TextRef } from "@/types/text";

const inline = (label: string) => label.replace(/^Один /, "").toLowerCase();

export function targetingFacetLabel(t: SpellTargeting): string {
  if (t.kind === "area") return `до ${t.maxTargets} ${t.side === "enemy" ? "ворогів" : "союзників"}`;

  if (t.kind === "template") return `${t.hollow && t.shape === "circle" ? "Кільце" : TEMPLATE_SHAPE_LABELS[t.shape]} ${t.size} фт`;

  return inline(SPELL_TARGETING_LABELS[t.kind]);
}

export function targetingLabel(t: SpellTargeting): TextRef {
  if (t.kind === "area") return textRef(t.side === "enemy" ? "spells.inline.area.enemy" : "spells.inline.area.ally", { count: t.maxTargets });

  if (t.kind === "template") return textRef("spells.inline.template", { shape: dynamicTextRef(`spells.shapes.${t.hollow && t.shape === "circle" ? "ring" : t.shape}`), size: t.size });

  return dynamicTextRef(`spells.inline.targeting.${t.kind}`);
}

export function resolutionLabel(r: SpellResolution): string {
  if (r.kind === "auto") return "автоматично";

  if (r.kind === "attack") return "атака заклинанням";

  return `рятівний кидок ${ABILITY_LABELS[r.ability]} (${inline(SPELL_SAVE_ON_SUCCESS_LABELS[r.onSuccess])})`;
}

export const costLabel = (c: SpellCost): string => inline(SPELL_COST_LABELS[c]);
