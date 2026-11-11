"use client";

import { useMemo } from "react";

import { useBattleSceneData } from "./useBattleScene";

import { ruleSystemOf } from "@/lib/utils/rules/systems";
export function useBattleRules() {
  const { battle } = useBattleSceneData();

  const { rules, system } = battle;

  return useMemo(() => {
    const { combat, d20Stats, distance, progression, spells, magic } = ruleSystemOf(rules);

    return {
      dice: combat.dice,
      serverJudged: combat.judge === "server",
      fortune: !!combat.fortune,
      actionEconomy: combat.actionEconomy,
      d20Stats,
      spells,
      magic: !!magic,
      distance,
      woundsLabel: progression.hpTerm === "wounds" ? ("wounds" as const) : ("hp" as const),
      systemKey: rules.system.key,
      sceneState: system,
    };
  }, [rules, system]);
}
