"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useBattleScene } from "./useBattleScene";

import { CELL_FEET } from "@/lib/constants/battle";
import { aimInRange, cellsOf, sizeOf } from "@/lib/utils/battle/grid";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleParticipant, GridPoint } from "@/types/battle";

/** Наведення вміння на клітинку карти: шаблон — слід учасника, Escape або «Скасувати» прибирають наведення. */
export function useAbilityMapAim(participant: BattleParticipant, onAim: (ability: ResolvedAbility, cell: GridPoint) => void) {
  const { intents: { setMapAim } } = useBattleScene();

  const [ability, setAbility] = useState<ResolvedAbility | null>(null);

  const fire = useRef(onAim);

  const origin = useRef(cellsOf(participant));

  useEffect(() => {
    fire.current = onAim;
    origin.current = cellsOf(participant);
  });

  const casterId = participant.basicInfo.id;

  const size = sizeOf(participant) * CELL_FEET;

  useEffect(() => {
    if (!ability?.aim) return;

    const { kind, range } = ability.aim;

    setMapAim({
      template: kind === "direction" ? { shape: "line", size: range } : { shape: "cube", size },
      casterId,
      range,
      onAim: (cell) => {
        if (kind === "direction" && !aimInRange(origin.current, cell, range)) return;

        setAbility(null);
        fire.current(ability, cell);
      },
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbility(null);
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      setMapAim(null);
    };
  }, [ability, casterId, size, setMapAim]);

  const cancel = useCallback(() => setAbility(null), []);

  return { ability, start: setAbility, cancel };
}
