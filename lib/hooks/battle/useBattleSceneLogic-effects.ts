/**
 * Ефекти логування ходу та індексів для useBattleSceneLogic.
 */

import { useEffect, useRef } from "react";

import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

export function useBattleSceneTurnLog(
  battle: BattleScene | null | undefined,
  attackFlowStartRef: React.MutableRefObject<number | null>,
  nextTurnClickedAtRef: React.MutableRefObject<number | null>,
) {
  const prevTurnKeyRef = useRef<string | null>(null);

  const prevTurnIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (
      !battle ||
      battle.status !== "active" ||
      !battle.initiativeOrder?.length
    )
      return;

    const turnKey = `${battle.currentRound}-${battle.currentTurnIndex}`;

    if (prevTurnKeyRef.current === turnKey) return;

    prevTurnKeyRef.current = turnKey;

    const current =
      battle.initiativeOrder[battle.currentTurnIndex]?.basicInfo?.name;

    const order = battle.initiativeOrder as BattleParticipant[];

    const hpSnapshot = order.map((p) => ({
      name: p.basicInfo.name,
      hp: `${p.combatStats.currentHp}/${p.combatStats.maxHp}`,
    }));

    const totalFromAttack =
      attackFlowStartRef.current != null
        ? Date.now() - attackFlowStartRef.current
        : null;

    attackFlowStartRef.current = null;
    console.info(
      "[хід] Раунд",
      battle.currentRound,
      "| Хід:",
      current,
      "| HP:",
      hpSnapshot,
      totalFromAttack != null
        ? `| ⏱️ Всього від Apply: ${totalFromAttack}ms`
        : "",
    );

    const activeEffectsSnapshot = order.map((p) => ({
      name: p.basicInfo.name,
      side: p.basicInfo.side,
      activeEffects: (p.battleData?.activeEffects ?? []).map((e) => ({
        name: e.name,
        duration: e.duration,
        type: e.type,
        appliesTo: {
          id: p.basicInfo.id,
          name: p.basicInfo.name,
          side: p.basicInfo.side,
        },
      })),
    }));

    console.info(
      "[ефекти] Усі учасники — активні ефекти:",
      activeEffectsSnapshot,
    );
  }, [battle, attackFlowStartRef]);

  useEffect(() => {
    if (!battle || battle.status !== "active") return;

    const turnIndex = battle.currentTurnIndex;

    const prev = prevTurnIndexRef.current;

    if (
      prev !== null &&
      prev !== turnIndex &&
      nextTurnClickedAtRef.current !== null
    ) {
      nextTurnClickedAtRef.current = null;
    }

    prevTurnIndexRef.current = turnIndex;
  }, [battle, nextTurnClickedAtRef]);
}
