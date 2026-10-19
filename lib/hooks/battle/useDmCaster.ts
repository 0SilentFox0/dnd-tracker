"use client";

import { useState } from "react";

import { useBattleScene } from "./useBattleScene";

import type { BattleParticipant } from "@/types/battle";

/** Заклинатель вільного касту ДМ: тримаємо id, бо рух і дельти міняють учасника, поки ДМ цілиться. */
export function useDmCaster() {
  const { battle } = useBattleScene();

  const [casterId, setCasterId] = useState<string | null>(null);

  const caster = battle.initiativeOrder.find((p) => p.basicInfo.id === casterId) ?? null;

  return { caster, select: (p: BattleParticipant) => setCasterId(p.basicInfo.id) };
}
