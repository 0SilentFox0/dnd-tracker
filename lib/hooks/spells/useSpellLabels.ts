"use client";

import { useCallback, useMemo } from "react";

import { useTranslator } from "@/lib/i18n/use-translator";
import type { SpellCost, SpellResolution, SpellTargeting } from "@/lib/utils/spells/model/schema";

export function useSpellLabels() {
  const t = useTranslator();

  const targeting = useCallback(
    (target: SpellTargeting): string => {
      if (target.kind === "area") return t(`spells.inline.area.${target.side === "enemy" ? "enemy" : "ally"}`, { count: target.maxTargets });

      if (target.kind === "template") {
        const shape = t(`spells.shapes.${target.hollow && target.shape === "circle" ? "ring" : target.shape}`);

        return t("spells.inline.template", { shape, size: target.size });
      }

      return t(`spells.inline.targeting.${target.kind}`);
    },
    [t],
  );

  const resolution = useCallback(
    (res: SpellResolution): string => {
      if (res.kind !== "save") return t(`spells.inline.resolution.${res.kind}`);

      return t("spells.inline.resolution.save", { ability: t(`gameTerms.abilities.${res.ability}.label`), onSuccess: t(`spells.inline.saveOnSuccess.${res.onSuccess}`) });
    },
    [t],
  );

  const cost = useCallback((c: SpellCost): string => t(`spells.inline.cost.${c}`), [t]);

  return useMemo(() => ({ targeting, resolution, cost }), [targeting, resolution, cost]);
}
