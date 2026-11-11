"use client";

import { useMemo } from "react";

import { useBattleSceneData } from "./useBattleScene";

import { ruleSystemOf } from "@/lib/utils/rules/systems";
import type { ParticipantSide } from "@/types/battle";
export function useBattleRules() {
  const { battle } = useBattleSceneData();

  const { rules, system } = battle;

  return useMemo(() => {
    const { combat, d20Stats, distance, progression, spells, magic } = ruleSystemOf(rules);

    return {
      dice: combat.dice,
      fortune: !!combat.fortune,
      actionEconomy: combat.actionEconomy,
      d20Stats,
      spells,
      magic: !!magic,
      distance,
      woundsLabel: progression.hpTerm === "wounds" ? ("wounds" as const) : ("hp" as const),
      sceneHeldBy: (side: ParticipantSide) => combat.sceneHeldBy?.(system, side) ?? false,
    };
  }, [rules, system]);
}
