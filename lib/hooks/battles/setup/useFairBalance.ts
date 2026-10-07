"use client";

import { useMemo } from "react";

import { type SetupBalanceParticipant, type SetupBalanceStats, setupFairScaling } from "@/lib/utils/battle/balance/setup";

export function useFairBalance(participants: SetupBalanceParticipant[], stats: SetupBalanceStats | null | undefined, raceId?: string | null) {
  return useMemo(() => (stats ? setupFairScaling(participants, stats, raceId) : null), [participants, stats, raceId]);
}
