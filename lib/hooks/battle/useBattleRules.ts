"use client";

import { useMemo } from "react";

import { useBattleSceneData } from "./useBattleScene";

import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { SceneMomentum } from "@/types/battle";

const NO_MOMENTUM: SceneMomentum = {};

export function useBattleRules() {
  const { battle } = useBattleSceneData();

  const { rules, momentum } = battle;

  return useMemo(() => {
    const { combat, d20Stats, distance, characteristics } = ruleSystemOf(rules);

    return {
      dice: combat.dice,
      actionEconomy: combat.actionEconomy,
      d20Stats,
      distance,
      woundsLabel: characteristics.kind === "wfrp" ? ("wounds" as const) : ("hp" as const),
      momentum: momentum ?? NO_MOMENTUM,
    };
  }, [rules, momentum]);
}
