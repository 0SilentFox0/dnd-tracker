import type { SpellCost, SpellResolution, SpellTargeting } from "./schema";

import { dynamicTextRef, textRef } from "@/lib/i18n/text-ref";
import type { Translator } from "@/lib/i18n/translator";
import type { TextRef } from "@/types/text";

export function targetingLabel(t: SpellTargeting): TextRef {
  if (t.kind === "area") return textRef(t.side === "enemy" ? "spells.inline.area.enemy" : "spells.inline.area.ally", { count: t.maxTargets });

  if (t.kind === "template") return textRef("spells.inline.template", { shape: dynamicTextRef(`spells.shapes.${t.hollow && t.shape === "circle" ? "ring" : t.shape}`), size: t.size });

  return dynamicTextRef(`spells.inline.targeting.${t.kind}`);
}

export function targetingFacetKey(t: SpellTargeting): string {
  if (t.kind === "area") return `area:${t.side}:${t.maxTargets}`;

  if (t.kind === "template") return `template:${t.hollow && t.shape === "circle" ? "ring" : t.shape}:${t.size}`;

  return t.kind;
}

export function spellLabelsOf(t: Translator) {
  return {
    targeting(target: SpellTargeting): string {
      if (target.kind === "area") return t(`spells.inline.area.${target.side === "enemy" ? "enemy" : "ally"}`, { count: target.maxTargets });

      if (target.kind === "template") return t("spells.inline.template", { shape: t(`spells.shapes.${target.hollow && target.shape === "circle" ? "ring" : target.shape}`), size: target.size });

      return t(`spells.inline.targeting.${target.kind}`);
    },
    resolution(res: SpellResolution): string {
      if (res.kind !== "save") return t(`spells.inline.resolution.${res.kind}`);

      return t("spells.inline.resolution.save", { ability: t(`gameTerms.abilities.${res.ability}.label`), onSuccess: t(`spells.inline.saveOnSuccess.${res.onSuccess}`) });
    },
    cost: (c: SpellCost): string => t(`spells.inline.cost.${c}`),
  };
}
