"use client";

import { useCallback, useMemo } from "react";

import { useTranslator } from "@/lib/i18n/use-translator";
import { readSpellDefinition } from "@/lib/utils/spells/model/read";
import type { SpellCost, SpellResolution, SpellTargeting } from "@/lib/utils/spells/model/schema";
import type { Spell } from "@/types/spells";

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

      return t("spells.inline.resolution.save", { ability: t(`common.abilities.${res.ability}.label`), onSuccess: t(`spells.inline.saveOnSuccess.${res.onSuccess}`) });
    },
    [t],
  );

  const cost = useCallback((c: SpellCost): string => t(`spells.inline.cost.${c}`), [t]);

  const mechanics = useCallback(
    (spell: Spell): string[] => {
      const def = readSpellDefinition({ id: spell.id, dice: spell.dice, cost: spell.cost, targeting: spell.targeting, resolution: spell.resolution, spellEffects: spell.spellEffects, raceModifiers: spell.raceModifiers });

      return [
        targeting(def.targeting),
        def.dice > 0 ? t("spells.mechanics.dice", { dice: def.dice }) : t("spells.mechanics.noDice"),
        ...(def.resolution.kind === "save" ? [resolution(def.resolution)] : []),
        ...(def.cost === "bonusAction" ? [cost(def.cost)] : []),
      ];
    },
    [t, targeting, resolution, cost],
  );

  return useMemo(() => ({ targeting, resolution, cost, mechanics }), [targeting, resolution, cost, mechanics]);
}
