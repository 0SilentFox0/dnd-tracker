"use client";

import { useMemo } from "react";

import { useBattleSceneData } from "./useBattleScene";

import { distanceOf } from "@/lib/utils/battle/grid/cell-feet";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
export function useBattleRules() {
  const { battle } = useBattleSceneData();

  const { rules, system } = battle;

  return useMemo(() => {
    const { combat, d20Stats, progression, spells, magic } = ruleSystemOf(rules);

    return {
      dice: combat.dice,
      serverJudged: combat.judge === "server",
      actionEconomy: combat.actionEconomy,
      d20Stats,
      spells,
      magic: !!magic.tested,
      distance: distanceOf(rules),
      hpTerm: progression.hpTerm,
      systemKey: rules.system.key,
      sceneState: system,
    };
  }, [rules, system]);
}
