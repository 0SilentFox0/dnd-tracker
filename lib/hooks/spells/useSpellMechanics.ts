"use client";

import { useCallback } from "react";

import { useSpellLabels } from "./useSpellLabels";

import { useTranslator } from "@/lib/i18n/use-translator";
import { readSpellDefinition } from "@/lib/utils/spells/model/read";
import type { Spell } from "@/types/spells";

// поза barrel: тягне zod, а barrel потрапляє в entry-чанки бою й профілю гравця
export function useSpellMechanics() {
  const t = useTranslator();

  const { targeting, resolution, cost } = useSpellLabels();

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

  return mechanics;
}
