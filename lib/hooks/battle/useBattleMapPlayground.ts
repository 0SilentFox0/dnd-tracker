"use client";

import { useCallback, useMemo, useState } from "react";

import { buildMockParticipants } from "./mock-participants";

import { CombatStatus, DEFAULT_BATTLE_MAP, MAZE_MARK_SYMBOLS } from "@/lib/constants/battle";
import { aimView, cellKey, cellsOf, deriveTrajectory, type MapAim, marginCells, moveMarks, moveZoneMarks, placeParticipants, targetMarks, templateArea } from "@/lib/utils/battle/grid";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { BattleMapActions, BattleMapConfig, BattleMapView, BattleParticipant, GridPoint, MazeMarkSymbol, SpellTemplate } from "@/types/battle";

export type BattleMapPlaygroundMode = "move" | "attack" | "template" | "maze-mark";

export type BattleMapPlaygroundLogKey = "mazeMark" | "outOfRange" | "template" | "move" | "hit" | "turn";

export interface BattleMapPlaygroundLogEntry {
  key: BattleMapPlaygroundLogKey;
  params: Record<string, string | number>;
}

export interface BattleMapPlaygroundSnapshot {
  map?: BattleMapConfig;
  participants?: BattleParticipant[];
}

const DEMO_DAMAGE = 7;

const DEMO_TERRAIN: NonNullable<BattleMapConfig["terrain"]> = {
  "9:3": { kind: "wall" },
  "9:4": { kind: "wall" },
  "9:5": { kind: "wall" },
  "6:7": { kind: "barrier", untilRound: 3 },
  "7:7": { kind: "barrier", untilRound: 3 },
  "12:8": { kind: "hazard", label: "Fire wall" },
  "13:8": { kind: "hazard", label: "Fire wall" },
  "12:9": { kind: "hazard", label: "Fire wall" },
};

const LOG_LIMIT = 6;

const DEMO_TEMPLATE: SpellTemplate = { shape: "circle", size: 20 };

const DEMO_RANGE = 60;

function initial(map: BattleMapConfig): BattleParticipant[] {
  return placeParticipants(map, buildMockParticipants());
}

export function useBattleMapPlayground(snapshot: BattleMapPlaygroundSnapshot = {}) {
  const authored = useMemo(() => {
    const map = snapshot.map ?? { ...DEFAULT_BATTLE_MAP, terrain: DEMO_TERRAIN };

    return { map, participants: snapshot.participants?.length ? snapshot.participants : initial(map) };
  }, [snapshot.map, snapshot.participants]);

  const [map, setMapState] = useState<BattleMapConfig>(authored.map);

  const [participants, setParticipants] = useState<BattleParticipant[]>(authored.participants);

  const [activeId, setActiveId] = useState<string>(() => participants[0].basicInfo.id);

  const [mode, setMode] = useState<BattleMapPlaygroundMode>("move");

  const [mazeMarkSymbol, setMazeMarkSymbol] = useState<MazeMarkSymbol>(MAZE_MARK_SYMBOLS[0]);

  const [hover, setHover] = useState<GridPoint | null>(null);

  const [log, setLog] = useState<BattleMapPlaygroundLogEntry[]>([]);

  const active = participants.find((p) => p.basicInfo.id === activeId) ?? participants[0];

  const attack = active.battleData.attacks[0];

  const [aim, setAim] = useState<GridPoint | null>(null);

  const mapAim = useMemo<MapAim>(() => ({ template: DEMO_TEMPLATE, casterId: active.basicInfo.id, range: DEMO_RANGE, onAim: () => undefined }), [active.basicInfo.id]);

  const aimed = mode === "template" ? ((hover && aimView({ map, participants, rules: DEFAULT_RULES }, mapAim, hover)) || (aim && aimView({ map, participants, rules: DEFAULT_RULES }, mapAim, aim))) : null;

  const marks = useMemo(
    () => (mode === "move" ? moveZoneMarks(map, participants, active, { rules: DEFAULT_RULES }) : mode === "attack" && attack ? targetMarks(map, participants, active, [attack], DEFAULT_RULES) : new Map()),
    [mode, map, participants, active, attack],
  );

  const costs = useMemo(() => moveMarks(map, participants, active, { rules: DEFAULT_RULES }), [map, participants, active]);

  const trajectory = mode === "attack" ? deriveTrajectory({ map, participants, marks, current: active, rules: DEFAULT_RULES }, hover) : null;

  const hud = useMemo(() => new Map(participants.map((p) => [p.basicInfo.id, { exact: true }])), [participants]);

  const view: BattleMapView = { selectedId: activeId, currentId: activeId, marks: aimed?.marks ?? marks, aim: aimed?.aim ?? null, trajectory, hud };

  const pushLog = useCallback((entry: BattleMapPlaygroundLogEntry) => setLog((prev) => [entry, ...prev].slice(0, LOG_LIMIT)), []);

  const [margin, setMarginState] = useState(0);

  const setMap = useCallback(
    (raw: BattleMapConfig) => {
      const next = { ...raw, blocked: marginCells(raw, margin) };

      setMapState((prev) => {
        if (next.cols !== prev.cols || next.rows !== prev.rows) setParticipants(initial(next));

        return next;
      });
    },
    [margin],
  );

  const setMargin = useCallback(
    (n: number) => {
      const value = Math.min(5, Math.max(0, Math.round(n) || 0));

      const next = { ...map, blocked: marginCells(map, value) };

      setMarginState(value);
      setMapState(next);
      setParticipants((prev) => placeParticipants(next, prev));
    },
    [map],
  );

  const onCellClick = useCallback(
    (p: GridPoint) => {
      const key = cellKey(p);

      if (mode === "maze-mark") {
        if (!map.maze) return;

        setMapState((prev) => prev.maze ? { ...prev, maze: { ...prev.maze, marks: { ...prev.maze.marks, [key]: { symbol: mazeMarkSymbol, color: "#f0c75e", by: activeId } } } } : prev);
        pushLog({ key: "mazeMark", params: { symbol: mazeMarkSymbol, cell: key } });

        return;
      }

      if (mode === "template") {
        if (!aimView({ map, participants, rules: DEFAULT_RULES }, mapAim, p)) return pushLog({ key: "outOfRange", params: {} });

        const hit = templateArea(map, participants, active, DEMO_TEMPLATE, p, DEFAULT_RULES).targets;

        setAim(p);
        pushLog({ key: "template", params: { cell: key, names: hit.map((q) => q.basicInfo.name).join(", ") } });

        return;
      }

      if (mode === "move") {
        const cost = marks.has(key) ? costs.get(key) : undefined;

        if (cost === undefined || cost <= 0) return;

        setParticipants((prev) =>
          prev.map((q) =>
            q.basicInfo.id === activeId ? { ...q, battleData: { ...q.battleData, position: p, movementUsed: (q.battleData.movementUsed ?? 0) + cost } } : q,
          ),
        );
        pushLog({ key: "move", params: { name: active.basicInfo.name, cost } });

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
      pushLog({ key: "hit", params: { name: active.basicInfo.name, target: target.basicInfo.name, damage: DEMO_DAMAGE } });
    },
    [mode, marks, costs, activeId, active, participants, pushLog, map, mapAim, mazeMarkSymbol],
  );

  const nextTurn = useCallback(() => {
    const alive = participants.filter((p) => p.combatStats.status === CombatStatus.ACTIVE);

    if (alive.length === 0) return;

    const index = alive.findIndex((p) => p.basicInfo.id === activeId);

    const next = alive[(index + 1) % alive.length];

    setActiveId(next.basicInfo.id);
    setParticipants((prev) => prev.map((p) => (p.basicInfo.id === next.basicInfo.id ? { ...p, battleData: { ...p.battleData, movementUsed: 0 } } : p)));
    pushLog({ key: "turn", params: { name: next.basicInfo.name } });
  }, [participants, activeId, pushLog]);

  const reset = useCallback(() => {
    setMapState(authored.map);
    setParticipants(authored.participants);
    setActiveId(authored.participants[0].basicInfo.id);
    setMode("move");
    setMazeMarkSymbol(MAZE_MARK_SYMBOLS[0]);
    setAim(null);
    setHover(null);
    setLog([]);
  }, [authored]);

  const actions: Omit<Required<BattleMapActions>, "onStroke" | "onReturn"> = {
    onCellClick,
    onCellHover: setHover,
    onTokenClick: setActiveId,
  };

  return { map, setMap, margin, setMargin, participants, activeId, active, mode, mazeMarkSymbol, view, actions, log, controls: { nextTurn, setMode, setMazeMarkSymbol, reset } };
}
