"use client";

import { useCallback, useMemo, useState } from "react";

import type { BattleMapActions, BattleMapView } from "@/components/battle/map";
import { buildMockParticipants } from "@/components/battle/map/dev/mock-participants";
import { CombatStatus, DEFAULT_BATTLE_MAP } from "@/lib/constants/battle";
import { cellKey, cellsOf, moveMarks, placeParticipants, targetMarks } from "@/lib/utils/battle/grid";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export type BattleMapPlaygroundMode = "move" | "attack";

const DEMO_DAMAGE = 7;

const LOG_LIMIT = 6;

function initial(map: BattleMapConfig): BattleParticipant[] {
  return placeParticipants(map, buildMockParticipants());
}

export function useBattleMapPlayground() {
  const [map, setMapState] = useState<BattleMapConfig>({ ...DEFAULT_BATTLE_MAP });

  const [participants, setParticipants] = useState<BattleParticipant[]>(() => initial(map));

  const [activeId, setActiveId] = useState<string>(() => participants[0].basicInfo.id);

  const [mode, setMode] = useState<BattleMapPlaygroundMode>("move");

  const [hover, setHover] = useState<GridPoint | null>(null);

  const [log, setLog] = useState<string[]>([]);

  const active = participants.find((p) => p.basicInfo.id === activeId) ?? participants[0];

  const attack = active.battleData.attacks[0];

  const marks = useMemo(
    () => (mode === "move" ? moveMarks(map, participants, active) : attack ? targetMarks(map, participants, active, attack) : new Map()),
    [mode, map, participants, active, attack],
  );

  const trajectory = mode === "attack" && hover && marks.get(cellKey(hover)) === "target" ? { fromId: activeId, to: hover } : null;

  const view: BattleMapView = { selectedId: activeId, currentId: activeId, marks, trajectory };

  const pushLog = useCallback((line: string) => setLog((prev) => [line, ...prev].slice(0, LOG_LIMIT)), []);

  const setMap = useCallback((next: BattleMapConfig) => {
    setMapState((prev) => {
      if (next.cols !== prev.cols || next.rows !== prev.rows) setParticipants(initial(next));

      return next;
    });
  }, []);

  const onCellClick = useCallback(
    (p: GridPoint) => {
      const key = cellKey(p);

      if (mode === "move") {
        const cost = marks.get(key);

        if (typeof cost !== "number" || cost <= 0) return;

        setParticipants((prev) =>
          prev.map((q) =>
            q.basicInfo.id === activeId ? { ...q, battleData: { ...q.battleData, position: p, movementUsed: (q.battleData.movementUsed ?? 0) + cost } } : q,
          ),
        );
        pushLog(`${active.basicInfo.name} йде (${cost} кл.)`);

        return;
      }

      if (marks.get(key) !== "target") return;

      const target = participants.find((q) => q.basicInfo.side !== active.basicInfo.side && cellsOf(q).some((c) => cellKey(c) === key));

      if (!target) return;

      setParticipants((prev) =>
        prev.map((q) => {
          if (q.basicInfo.id !== target.basicInfo.id) return q;

          const currentHp = Math.max(0, q.combatStats.currentHp - DEMO_DAMAGE);

          return { ...q, combatStats: { ...q.combatStats, currentHp, status: currentHp <= 0 ? CombatStatus.DEAD : q.combatStats.status } };
        }),
      );
      pushLog(`${active.basicInfo.name} б'є ${target.basicInfo.name}: -${DEMO_DAMAGE}`);
    },
    [mode, marks, activeId, active, participants, pushLog],
  );

  const nextTurn = useCallback(() => {
    const alive = participants.filter((p) => p.combatStats.status === CombatStatus.ACTIVE);

    if (alive.length === 0) return;

    const index = alive.findIndex((p) => p.basicInfo.id === activeId);

    const next = alive[(index + 1) % alive.length];

    setActiveId(next.basicInfo.id);
    setParticipants((prev) => prev.map((p) => (p.basicInfo.id === next.basicInfo.id ? { ...p, battleData: { ...p.battleData, movementUsed: 0 } } : p)));
    pushLog(`Хід: ${next.basicInfo.name}`);
  }, [participants, activeId, pushLog]);

  const reset = useCallback(() => {
    const fresh = initial(map);

    setParticipants(fresh);
    setActiveId(fresh[0].basicInfo.id);
    setMode("move");
    setLog([]);
  }, [map]);

  const actions: Required<BattleMapActions> = {
    onCellClick,
    onCellHover: setHover,
    onTokenClick: setActiveId,
  };

  return { map, setMap, participants, activeId, active, mode, view, actions, log, controls: { nextTurn, setMode, reset } };
}
