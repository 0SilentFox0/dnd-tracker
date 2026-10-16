"use client";

import { useContext } from "react";

import { BattleSceneDataContext } from "./useBattleScene";

import type { ParticipantFace } from "@/lib/utils/battle/view";

export function useParticipantFace(id: string | undefined): ParticipantFace | undefined {
  const data = useContext(BattleSceneDataContext);

  return id ? data?.faces.get(id) : undefined;
}
