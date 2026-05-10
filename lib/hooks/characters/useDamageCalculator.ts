"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type { SkillTreeProgress } from "./useCharacterView";
import { useDamageCalculatorSkills } from "./useDamageCalculator-skills";
import { useDamageCalculatorSpell } from "./useDamageCalculator-spell";
import { useLearnedSpellIds } from "./useLearnedSpellIds";

import {
  fetchDamagePreview,
  parseDiceFormulaToSides,
} from "@/components/characters/stats/damage-calculator-utils";
import { getSpells } from "@/lib/api/spells";
import { AttackType } from "@/lib/constants/battle";
import { getHeroDamageComponents } from "@/lib/constants/hero-scaling";
import { useSkills } from "@/lib/hooks/skills";

export interface UseDamageCalculatorProps {
  campaignId: string;
  characterId: string;
  level: number;
  scalingCoefficients?: {
    meleeMultiplier?: number;
    rangedMultiplier?: number;
  };
  skillTreeProgress: SkillTreeProgress;
  /** Раса для злиття заклинань з дерева скілів (як у книзі заклинань) */
  characterRace?: string;
  /** Базовий список knownSpells з персонажа; доповнюється заклинаннями з дерева */
  knownSpellIds: string[];
}

export function useDamageCalculator({
  campaignId,
  characterId,
  level,
  scalingCoefficients = {},
  skillTreeProgress,
  characterRace,
  knownSpellIds,
}: UseDamageCalculatorProps) {
  const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null);

  const learnedSpellIds = useLearnedSpellIds({
    campaignId,
    characterRace,
    skillTreeProgress,
    knownSpellIdsFallback: knownSpellIds,
  });

  const [meleeDiceValues, setMeleeDiceValues] = useState<number[]>([]);

  const [rangedDiceValues, setRangedDiceValues] = useState<number[]>([]);

  const [magicDiceValues, setMagicDiceValues] = useState<number[]>([]);

  const [meleeSum, setMeleeSumState] = useState<number | null>(null);

  const [rangedSum, setRangedSumState] = useState<number | null>(null);

  const [magicSum, setMagicSumState] = useState<number | null>(null);

  const meleeMult = scalingCoefficients.meleeMultiplier ?? 1;

  const rangedMult = scalingCoefficients.rangedMultiplier ?? 1;

  const setSelectedSpellIdAndClearMagic = useCallback(
    (id: string | null) => {
      setMagicSumState(null);

      setSelectedSpellId(id);
    },
    [],
  );

  /** Окремий ключ/запит: інакше спільний префікс з CharacterDamagePreview перезаписує відповідь без spellId → magic завжди null. */
  const { data: damagePreview } = useQuery({
    queryKey: [
      "damage-calculator-melee-ranged",
      campaignId,
      characterId,
      meleeMult,
      rangedMult,
      meleeSum,
      rangedSum,
    ],
    queryFn: () =>
      fetchDamagePreview(
        campaignId,
        characterId,
        meleeMult,
        rangedMult,
        meleeSum,
        rangedSum,
      ),
    enabled: !!campaignId && !!characterId,
  });

  const magicSpellEnabled =
    !!campaignId &&
    !!characterId &&
    !!selectedSpellId &&
    magicSum != null;

  const { data: magicSpellPayload, isFetching: magicPreviewFetching } = useQuery(
    {
      queryKey: [
        "damage-calculator-magic-spell",
        campaignId,
        characterId,
        meleeMult,
        rangedMult,
        selectedSpellId,
        magicSum,
      ],
      queryFn: () =>
        fetchDamagePreview(
          campaignId,
          characterId,
          meleeMult,
          rangedMult,
          null,
          null,
          selectedSpellId,
          magicSum,
        ),
      enabled: magicSpellEnabled,
    },
  );

  const magicPreview = magicSpellPayload?.magic ?? null;

  // Клієнтський лог: щоб бачити breakdown у браузерній консолі при кожному
  // оновленні magic preview (наприклад, після клацання "Рахувати" у magic-табі).
  // Серверний лог `[magic-damage]` пише деталі activeSkills у Vercel Functions logs.
  useEffect(() => {
    if (!magicPreview) return;

    console.info("[damage-calc] magic preview", {
      total: magicPreview.total,
      diceFormula: magicPreview.diceFormula,
      breakdown: magicPreview.breakdown,
      submittedSum: magicSum,
      spellId: selectedSpellId,
      targets: magicPreview.targets,
      targetsTotal: magicPreview.targetsTotal,
      distribution: magicPreview.distribution,
    });
  }, [magicPreview, magicSum, selectedSpellId]);

  const { data: skillsList = [] } = useSkills(campaignId);

  const { data: spellsList = [] } = useQuery({
    queryKey: ["spells", campaignId],
    queryFn: () => getSpells(campaignId),
    enabled: !!campaignId,
  });

  const heroMelee = getHeroDamageComponents(level, AttackType.MELEE);

  const heroRanged = getHeroDamageComponents(level, AttackType.RANGED);

  const meleeDiceSides = useMemo(() => {
    if (!damagePreview) return [];

    const formula = [damagePreview.melee.diceFormula, heroMelee.diceNotation]
      .filter(Boolean)
      .join("+");

    return parseDiceFormulaToSides(formula);
  }, [damagePreview, heroMelee.diceNotation]);

  const rangedDiceSides = useMemo(() => {
    if (!damagePreview) return [];

    const formula = [damagePreview.ranged.diceFormula, heroRanged.diceNotation]
      .filter(Boolean)
      .join("+");

    return parseDiceFormulaToSides(formula);
  }, [damagePreview, heroRanged.diceNotation]);

  const { unlockedSkillIds, skillsAffectingDamage } = useDamageCalculatorSkills(
    skillTreeProgress,
    skillsList,
  );

  const {
    knownSpells,
    skillsAffectingSpell,
    selectedSpell,
    magicDiceSides,
  } = useDamageCalculatorSpell(
    selectedSpellId,
    learnedSpellIds,
    spellsList,
    skillsList,
    unlockedSkillIds,
  );

  const meleeDiceKey = meleeDiceSides.join(",");

  useEffect(() => {
    if (meleeDiceSides.length === 0) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form state to derived dice sides
    setMeleeDiceValues((prev) =>
      meleeDiceSides.map((s, i) =>
        prev[i] !== undefined && prev[i] >= 1 && prev[i] <= s ? prev[i] : 1,
      ),
    );
  }, [meleeDiceSides, meleeDiceKey]);

  const rangedDiceKey = rangedDiceSides.join(",");

  useEffect(() => {
    if (rangedDiceSides.length === 0) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form state to derived dice sides
    setRangedDiceValues((prev) =>
      rangedDiceSides.map((s, i) =>
        prev[i] !== undefined && prev[i] >= 1 && prev[i] <= s ? prev[i] : 1,
      ),
    );
  }, [rangedDiceSides, rangedDiceKey]);

  const magicDiceKey = magicDiceSides.join(",");

  useEffect(() => {
    if (magicDiceSides.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear when no dice
      setMagicDiceValues([]);

      return;
    }

    setMagicDiceValues((prev) =>
      magicDiceSides.map((s, i) =>
        prev[i] !== undefined && prev[i] >= 1 && prev[i] <= s ? prev[i] : 1,
      ),
    );
  }, [magicDiceSides, magicDiceKey]);

  const submitMeleeRolls = (rolls: number[]) => {
    setMeleeDiceValues(rolls);

    setMeleeSumState(rolls.reduce((a, b) => a + b, 0));
  };

  const submitRangedRolls = (rolls: number[]) => {
    setRangedDiceValues(rolls);

    setRangedSumState(rolls.reduce((a, b) => a + b, 0));
  };

  const submitMagicRolls = (rolls: number[]) => {
    setMagicDiceValues(rolls);

    setMagicSumState(rolls.reduce((a, b) => a + b, 0));
  };

  return {
    damagePreview,
    magicPreview,
    magicPreviewFetching,
    hero: { heroMelee, heroRanged },
    dice: {
      melee: {
        sides: meleeDiceSides,
        values: meleeDiceValues,
        sum: meleeSum,
        submitRolls: submitMeleeRolls,
      },
      ranged: {
        sides: rangedDiceSides,
        values: rangedDiceValues,
        sum: rangedSum,
        submitRolls: submitRangedRolls,
      },
      magic: {
        sides: magicDiceSides,
        values: magicDiceValues,
        sum: magicSum,
        submitRolls: submitMagicRolls,
      },
    },
    spell: {
      selectedSpellId,
      setSelectedSpellId: setSelectedSpellIdAndClearMagic,
      knownSpells,
      selectedSpell,
    },
    skills: {
      affectingDamage: skillsAffectingDamage,
      affectingSpell: skillsAffectingSpell,
    },
  };
}
