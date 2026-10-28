"use client";

import { type Dispatch, useCallback, useEffect, useRef, useState } from "react";

import { spellAimTargets, type SpellFlowAction, type SpellFlowState } from "@/lib/utils/battle/flows";
import type { MapAim, MapPick } from "@/lib/utils/battle/grid";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";

export interface MapTargetingContext {
  caster: BattleParticipant | null;
  order: BattleParticipant[];
  map: BattleMapConfig | null;
  active: boolean;
  candidates: BattleParticipant[];
  inRange(t: BattleParticipant): boolean;
  setMapAim(aim: MapAim | null): void;
  setMapPick(pick: MapPick | null): void;
}

/** Крок цілей на карті: шаблон приймає точку наведення, решта — клік по токену; ховер віддає точку прев'ю, Escape скасовує. */
export function useSpellMapTargeting(state: SpellFlowState, dispatch: Dispatch<SpellFlowAction>, ctx: MapTargetingContext): GridPoint | null {
  const { caster, order, map, active, candidates, inRange, setMapAim, setMapPick } = ctx;

  const aimAt = useRef<(cell: GridPoint) => void>(() => undefined);

  const pickAt = useRef<(id: string) => void>(() => undefined);

  const latest = useRef({ candidates, inRange });

  const [hover, setHover] = useState<GridPoint | null>(null);

  useEffect(() => {
    latest.current = { candidates, inRange };
    aimAt.current = (cell) => {
      if (!map || !caster || !state.pick) return;

      const ids = spellAimTargets({ map, participants: order, caster }, state.pick, cell).map((p) => p.basicInfo.id);

      dispatch({ type: "SET_AIM", aim: cell, targetIds: ids });
      // клік у межах дальності і є підтвердженням, навіть якщо зона нікого не зачепила
      dispatch({ type: "CONFIRM_TARGETS" });
    };
    pickAt.current = (id) => {
      const target = order.find((p) => p.basicInfo.id === id);

      if (target && inRange(target)) dispatch({ type: "PICK_TARGET", id });
    };
  });

  const onAim = useCallback((cell: GridPoint) => aimAt.current(cell), []);

  const onPick = useCallback((id: string) => pickAt.current(id), []);

  const template = active && state.pick?.targetMode === "template" ? state.pick.template : undefined;

  const picking = active && !!state.pick && state.pick.targetMode !== "template";

  const range = state.pick?.range;

  const casterId = caster?.basicInfo.id;

  useEffect(() => {
    if (!template || !casterId) return;

    setMapAim({ template, casterId, ...(range !== undefined && { range }), ...(state.aim && { aim: state.aim }), onAim, onHover: setHover });

    return () => {
      setMapAim(null);
      setHover(null);
    };
  }, [template, casterId, range, state.aim, onAim, setMapAim]);

  const pickSignature = picking ? candidates.map((p) => `${p.basicInfo.id}${inRange(p) ? "+" : "-"}`).join(",") : "";

  const pickedIds = state.targetIds.join(",");

  useEffect(() => {
    if (!picking || !casterId) return;

    const { candidates: list, inRange: reach } = latest.current;

    setMapPick({ casterId, targets: list.map((p) => ({ id: p.basicInfo.id, reachable: reach(p) })), selectedIds: pickedIds ? pickedIds.split(",") : [], onPick });

    return () => setMapPick(null);
  }, [picking, casterId, pickSignature, pickedIds, onPick, setMapPick]);

  useEffect(() => {
    if (!active) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "CLOSE" });
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [active, dispatch]);

  return template ? hover : null;
}
