"use client";

import { useState } from "react";

import { useBattleScene } from "./useBattleScene";

import { BattleStatus } from "@/lib/constants/battle";
import { moveId } from "@/lib/utils/battle/turn";

export function useInitiativeOrder(ids: string[]) {
  const [order, setOrder] = useState(ids);

  return {
    order,
    move: (id: string, toIndex: number) => setOrder((o) => moveId(o, id, toIndex)),
    isChanged: order.some((id, i) => id !== ids[i]),
  };
}

export function useTrackReorder(): ((order: string[]) => void) | undefined {
  const { viewer, battle, actions } = useBattleScene();

  if (!viewer.isDM || battle.status !== BattleStatus.ACTIVE) return undefined;

  return (order) => actions.initiativeReorder.mutate({ order });
}
