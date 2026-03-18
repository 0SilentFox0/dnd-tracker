"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type { SkillTreeProgress } from "./useCharacterView";
import { useDamageCalculatorSkills } from "./useDamageCalculator-skills";
import { useDamageCalculatorSpell } from "./useDamageCalculator-spell";

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
  knownSpellIds: string[];
}

export function useDamageCalculator({
  campaignId,
  characterId,
  level,
  scalingCoefficients = {},
  skillTreeProgress,
  knownSpellIds,
}: UseDamageCalculatorProps) {
  const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null);

  const [meleeDiceValues, setMeleeDiceValues] = useState<number[]>([]);

  const [rangedDiceValues, setRangedDiceValues] = useState<number[]>([]);

  const [magicDiceValues, setMagicDiceValues] = useState<number[]>([]);

  const [meleeSum, setMeleeSumState] = useState<number | null>(null);

  const [rangedSum, setRangedSumState] = useState<number | null>(null);

  const [magicSum, setMagicSumState] = useState<number | null>(null);

  const meleeMult = scalingCoefficients.meleeMultiplier ?? 1;

  const rangedMult = scalingCoefficients.rangedMultiplier ?? 1;

  const { data: damagePreview } = useQuery({
    queryKey: [
      "character-damage-preview",
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

  const { data: skillsList = [] } = useSkills(campaignId);

  const { data: spellsList = [] } = useQuery({
    queryKey: ["spells", campaignId],
    queryFn: () => getSpells(campaignId),
    enabled: !!campaignId && knownSpellIds.length > 0,
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
    knownSpellIds,
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

  const setMeleeDiceAt = (index: number, value: number) => {
    setMeleeDiceValues((prev) =>
      meleeDiceSides.map((s, j) => (j === index ? value : prev[j] ?? 1)),
    );
  };

  const setRangedDiceAt = (index: number, value: number) => {
    setRangedDiceValues((prev) =>
      rangedDiceSides.map((s, j) => (j === index ? value : prev[j] ?? 1)),
    );
  };

  const setMagicDiceAt = (index: number, value: number) => {
    setMagicDiceValues((prev) =>
      magicDiceSides.map((s, j) => (j === index ? value : prev[j] ?? 1)),
    );
  };

  const handleCalculateMelee = () =>
    setMeleeSumState(meleeDiceValues.reduce((a, b) => a + b, 0));

  const handleCalculateRanged = () =>
    setRangedSumState(rangedDiceValues.reduce((a, b) => a + b, 0));

  const handleCalculateMagic = () =>
    setMagicSumState(magicDiceValues.reduce((a, b) => a + b, 0));

  return {
    damagePreview,
    hero: { heroMelee, heroRanged },
    dice: {
      melee: {
        sides: meleeDiceSides,
        values: meleeDiceValues,
        sum: meleeSum,
        setSum: handleCalculateMelee,
        setValueAt: setMeleeDiceAt,
      },
      ranged: {
        sides: rangedDiceSides,
        values: rangedDiceValues,
        sum: rangedSum,
        setSum: handleCalculateRanged,
        setValueAt: setRangedDiceAt,
      },
      magic: {
        sides: magicDiceSides,
        values: magicDiceValues,
        sum: magicSum,
        setSum: handleCalculateMagic,
        setValueAt: setMagicDiceAt,
      },
    },
    spell: {
      selectedSpellId,
      setSelectedSpellId,
      knownSpells,
      selectedSpell,
    },
    skills: {
      affectingDamage: skillsAffectingDamage,
      affectingSpell: skillsAffectingSpell,
    },
  };
}
