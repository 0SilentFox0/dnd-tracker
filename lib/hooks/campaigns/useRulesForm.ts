"use client";

import { useState } from "react";

import { useCampaignRules, useUpdateCampaignRules } from "./useCampaignRules";

import { AttackType } from "@/lib/constants/battle";
import { MAX_CLASS_LEVEL } from "@/lib/constants/classes";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import { useNotify } from "@/lib/hooks/common";
import { DEFAULT_RULES, type Ruleset, type RulesetPatch } from "@/lib/utils/rules";

export const HERO_LEVELS = Array.from({ length: MAX_CLASS_LEVEL }, (_, i) => i + 1);

export interface RulesFormState {
  data: Ruleset;
  set: <K extends keyof Ruleset>(key: K, value: Ruleset[K]) => void;
}

type DiceTable = Record<string, string> | null;

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const fillDiceTable = (table: DiceTable, type: AttackType): DiceTable =>
  table && Object.fromEntries(HERO_LEVELS.map((level) => [level, table[level]?.trim() || getHeroDamageDiceForLevel(level, type)]));

const withFilledDice = (heroScaling: Ruleset["heroScaling"]): Ruleset["heroScaling"] => ({
  ...heroScaling,
  meleeDiceByLevel: fillDiceTable(heroScaling.meleeDiceByLevel, AttackType.MELEE),
  rangedDiceByLevel: fillDiceTable(heroScaling.rangedDiceByLevel, AttackType.RANGED),
});

export function useRulesForm(campaignId: string) {
  const query = useCampaignRules(campaignId);

  const update = useUpdateCampaignRules(campaignId);

  const notify = useNotify();

  const [changes, setChanges] = useState<Partial<Ruleset>>({});

  const server = query.data ?? DEFAULT_RULES;

  const data: Ruleset = { ...server, ...changes };

  const dirtyKeys = (Object.keys(changes) as (keyof Ruleset)[]).filter((key) => !same(changes[key], server[key]));

  const form: RulesFormState = {
    data,
    set: (key, value) => setChanges((prev) => ({ ...prev, [key]: value })),
  };

  const save = async () => {
    if (dirtyKeys.length === 0) return true;

    const patch = Object.fromEntries(dirtyKeys.map((key) => [key, key === "heroScaling" ? withFilledDice(data.heroScaling) : data[key]])) as RulesetPatch;

    try {
      await update.mutateAsync(patch);
      setChanges({});

      return true;
    } catch (error) {
      await notify(error instanceof Error ? error.message : "Не вдалося зберегти правила");

      return false;
    }
  };

  return {
    form,
    save,
    isSaving: update.isPending,
    isDirty: dirtyKeys.length > 0,
    isLoading: query.isLoading,
    reset: () => setChanges({}),
  };
}
