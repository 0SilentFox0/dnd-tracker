"use client";

import { useMemo } from "react";

import { type SetupBalanceParticipant, type SetupBalanceStats, setupXpBudget } from "@/lib/utils/battle/balance/setup";
import type { Ruleset } from "@/lib/utils/rules";

export function useXpBalance(participants: SetupBalanceParticipant[], stats: SetupBalanceStats | null | undefined, encounters: Ruleset["encounters"]) {
  const { balance, edition } = encounters;

  return useMemo(() => (balance === "xp" && stats ? setupXpBudget(participants, stats, edition) : null), [participants, stats, balance, edition]);
}
